import { randomBytes } from "node:crypto";
import { getAnthropicClient, RESEARCH_MODEL, SYNTHESIS_MODEL } from "../AnthropicClient";
import { estimateCostUsd, type UsageTotals } from "../UsageTracking";
import {
  type AgentRun,
  type AuditProgramme,
  type ScopeArea,
} from "@/server/domain/programme";
import {
  countSelections,
  labelsFor,
  sanitiseIntake,
  selectionsFor,
  type RiskIntake,
} from "@/server/domain/riskIntake";
import { getAuditDomain, type AuditDomain } from "@/server/domain/auditDomain";
import "@/server/domain/domains";
import { runRiskAgent } from "./agents/RiskAgent";
import { runObligationsAgent } from "./agents/ObligationsAgent";
import { runScopeAgent } from "./agents/ScopeAgent";
import { runEvidenceAgent } from "./agents/EvidenceAgent";
import { clamp, collapse } from "./agents/shared";

/**
 * The pipeline, in two halves separated by a human decision.
 *
 * `planProgramme` runs the three cheap agents and stops. `draftApprovedSteps`
 * runs the expensive one, and only over what the auditor kept. They are
 * separate exported functions rather than one function with a flag because the
 * checkpoint is the feature: there is no code path that goes from intake to
 * finished programme without someone approving the scope in between.
 *
 * Every stage records an `AgentRun` — what it produced, what it cost, what it
 * dropped. That record is persisted with the programme and rendered as a
 * timeline, which is what makes the pipeline something an auditor can inspect
 * rather than a box that emits a document.
 */

export interface PlanResult {
  programme: AuditProgramme;
  /** Reported to the caller so a partial result is never presented as clean. */
  warnings: string[];
}

export async function planProgramme(rawIntake: RiskIntake): Promise<PlanResult> {
  const client = getAnthropicClient();
  const domain = getAuditDomain(rawIntake.domain);

  // Re-sanitised here rather than trusted from the route: this is the last
  // point before the selections reach a prompt, and a required dimension left
  // empty would produce an assessment that cannot be defended as the one the
  // framework asks for.
  const { intake, problems } = sanitiseIntake(rawIntake);
  if (problems.length > 0) {
    throw new Error(problems.map((problem) => problem.message).join("; "));
  }

  const runs: AgentRun[] = [];

  // Risk and MAS are independent: one reasons about the firm, the other reads
  // the rulebook. Running them together halves the wall-clock time before the
  // auditor sees anything, and neither can inform the other anyway.
  const riskStarted = nowIso();
  const masStarted = nowIso();
  const [risk, mas] = await Promise.all([
    runRiskAgent(client, domain, intake),
    runObligationsAgent(client, domain, intake),
  ]);

  runs.push(
    recordRun({
      agent: "risk",
      startedAt: riskStarted,
      model: RESEARCH_MODEL,
      produced:
        `${risk.factors.length} risk factors across ` +
        `${new Set(risk.factors.map((factor) => factor.dimension)).size} dimensions, ` +
        `from ${countSelections(intake)} intake selections`,
      usage: risk.usage,
      notes: risk.notes,
    }),
  );
  runs.push(
    recordRun({
      agent: "obligations",
      startedAt: masStarted,
      model: RESEARCH_MODEL,
      produced:
        `${mas.obligations.length} obligations across ` +
        `${new Set(mas.obligations.flatMap((item) => (item.theme ? [item.theme] : []))).size} ` +
        `of ${domain.themes.length} themes, from ${mas.sources.size} sources`,
      usage: mas.usage,
      notes: mas.notes,
    }),
  );

  const scopeStarted = nowIso();
  const scope = await runScopeAgent(client, domain, intake, risk.factors, mas.obligations);
  runs.push(
    recordRun({
      agent: "scope",
      startedAt: scopeStarted,
      model: SYNTHESIS_MODEL,
      produced: `${scope.areas.length} proposed control areas`,
      usage: scope.usage,
      notes: scope.notes,
    }),
  );

  const programme: AuditProgramme = {
    id: newProgrammeId(),
    domain: domain.id,
    title: titleFor(domain, intake),
    status: "planned",
    createdAt: nowIso(),
    intake,
    scopeSummary: scope.scopeSummary,
    riskFactors: risk.factors,
    obligations: mas.obligations,
    scopeAreas: scope.areas,
    runs,
  };

  return { programme, warnings: runs.flatMap((run) => run.notes) };
}

/**
 * Runs the Evidence Agent over the areas the auditor approved.
 *
 * `approvedAreaIds` is applied here rather than trusted from the stored
 * document, so the approval that reaches the model is the one the auditor just
 * made in the browser, not whatever the file happened to contain.
 */
export async function draftApprovedSteps(
  programme: AuditProgramme,
  approvedAreaIds: string[],
): Promise<PlanResult> {
  const client = getAnthropicClient();
  const approved = new Set(approvedAreaIds);

  const scopeAreas: ScopeArea[] = programme.scopeAreas.map((area) => ({
    ...area,
    approved: approved.has(area.id),
    // An area the auditor has just dropped loses any steps a previous run wrote
    // for it — otherwise a re-run would leave stale procedures attached to
    // something now marked out of scope.
    steps: approved.has(area.id) ? area.steps : [],
  }));

  if (!scopeAreas.some((area) => area.approved)) {
    throw new Error("Approve at least one control area before drafting the testing steps.");
  }

  const startedAt = nowIso();
  const evidence = await runEvidenceAgent(
    client,
    getAuditDomain(programme.domain),
    scopeAreas,
    programme.riskFactors,
    programme.obligations,
  );

  const stepCount = evidence.areas.reduce((total, area) => total + area.steps.length, 0);
  const approvedCount = scopeAreas.filter((area) => area.approved).length;

  const run = recordRun({
    agent: "evidence",
    startedAt,
    model: SYNTHESIS_MODEL,
    produced: `${stepCount} testing steps across ${approvedCount} approved areas`,
    usage: evidence.usage,
    notes: evidence.notes,
  });

  // A re-run replaces the previous evidence entry rather than appending a
  // second one: the timeline shows the pipeline that produced the document in
  // front of you, not every attempt.
  const runs = [...programme.runs.filter((entry) => entry.agent !== "evidence"), run];

  return {
    programme: {
      ...programme,
      status: "complete",
      completedAt: nowIso(),
      scopeAreas: evidence.areas,
      runs,
    },
    warnings: evidence.notes,
  };
}

function recordRun(input: {
  agent: AgentRun["agent"];
  startedAt: string;
  model: string;
  produced: string;
  usage: UsageTotals;
  notes: string[];
}): AgentRun {
  const cost = estimateCostUsd(input.usage, input.model);

  return {
    agent: input.agent,
    startedAt: input.startedAt,
    finishedAt: nowIso(),
    model: input.model,
    produced: input.produced,
    // An unpriced model yields NaN, which the schema rejects; zero is the
    // honest floor and the timeline reads it as "not estimated".
    costUsd: Number.isFinite(cost) ? cost : 0,
    notes: input.notes.map((note) => clamp(collapse(note), 200)),
  };
}

/**
 * Named from whichever dimension the domain says identifies an audit — products
 * for AML, the estate for technology — so a list of programmes is readable
 * without opening them.
 */
function titleFor(domain: AuditDomain, intake: RiskIntake): string {
  const labels = labelsFor(domain, domain.titleDimension, selectionsFor(intake, domain.titleDimension));
  const subject =
    labels.length === 0
      ? ""
      : labels.length <= 2
        ? labels.join(" and ")
        : `${labels[0]} and ${labels.length - 1} more`;

  return clamp(subject ? `${domain.titlePrefix} — ${subject}` : `${domain.titlePrefix} programme`, 120);
}

function newProgrammeId(): string {
  return `${new Date().toISOString().slice(0, 10)}-${randomBytes(3).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}
