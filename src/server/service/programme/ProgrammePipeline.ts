import { randomBytes } from "node:crypto";
import { getAnthropicClient, RESEARCH_MODEL, SYNTHESIS_MODEL } from "../AnthropicClient";
import { estimateCostUsd, type UsageTotals } from "../UsageTracking";
import {
  type AgentRun,
  type AuditProgramme,
  type ScopeArea,
} from "@/server/domain/programme";
import { labelsFor, sanitiseIntake, type RiskIntake } from "@/server/domain/riskIntake";
import { runRiskAgent } from "./agents/RiskAgent";
import { runMasAgent } from "./agents/MasAgent";
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
  const intake = sanitiseIntake(rawIntake);
  const runs: AgentRun[] = [];

  // Risk and MAS are independent: one reasons about the firm, the other reads
  // the rulebook. Running them together halves the wall-clock time before the
  // auditor sees anything, and neither can inform the other anyway.
  const riskStarted = nowIso();
  const masStarted = nowIso();
  const [risk, mas] = await Promise.all([
    runRiskAgent(client, intake),
    runMasAgent(client, intake),
  ]);

  runs.push(
    recordRun({
      agent: "risk",
      startedAt: riskStarted,
      model: RESEARCH_MODEL,
      produced: `${risk.factors.length} risk factors from ${countSelections(intake)} intake selections`,
      usage: risk.usage,
      notes: risk.notes,
    }),
  );
  runs.push(
    recordRun({
      agent: "mas",
      startedAt: masStarted,
      model: RESEARCH_MODEL,
      produced: `${mas.obligations.length} obligations across ${mas.sources.size} sources`,
      usage: mas.usage,
      notes: mas.notes,
    }),
  );

  const scopeStarted = nowIso();
  const scope = await runScopeAgent(client, intake, risk.factors, mas.obligations);
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
    title: titleFor(intake),
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

function countSelections(intake: RiskIntake): number {
  return (
    intake.businessLines.length +
    intake.clientBase.length +
    intake.channels.length +
    intake.riskFlags.length
  );
}

/**
 * Named from the intake, so a list of programmes is readable without opening
 * them. Falls back to the generic title only when nothing was selected, which
 * the schema already makes near-impossible.
 */
function titleFor(intake: RiskIntake): string {
  const lines = labelsFor("businessLines", intake.businessLines);
  const subject = lines.length === 0 ? "" : lines.length <= 2 ? lines.join(" and ") : `${lines[0]} and ${lines.length - 1} other lines`;

  return clamp(subject ? `AML/CFT audit — ${subject}` : "AML/CFT audit programme", 120);
}

function newProgrammeId(): string {
  return `${new Date().toISOString().slice(0, 10)}-${randomBytes(3).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}
