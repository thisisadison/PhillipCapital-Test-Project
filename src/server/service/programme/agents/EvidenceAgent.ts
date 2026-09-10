import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SYNTHESIS_MODEL } from "@/server/service/AnthropicClient";
import { usageFrom, type UsageTotals } from "@/server/service/UsageTracking";
import type { AuditStep, Obligation, RiskFactor, ScopeArea } from "@/server/domain/programme";
import { betaFieldsFor, clamp, collapse, effortFor, hashId } from "./shared";

/**
 * Evidence Agent — writes the testing procedures, and only for approved areas.
 *
 * Runs after the checkpoint, which is the point: the most expensive stage in
 * the pipeline never drafts anything the auditor has already said they don't
 * want. Unticking two of six areas is a third off this call.
 *
 * Every step names the evidence it needs. A procedure an auditor cannot
 * evidence is a sentence, not a test, and this is where that distinction is
 * enforced — a step with no stated evidence is dropped.
 */

const MAX_STEPS_PER_AREA = 6;

const draftSchema = z.object({
  areas: z.array(
    z.object({
      /** An `A` handle from the prompt. Free text does not resolve. */
      areaId: z.string(),
      steps: z.array(
        z.object({
          procedure: z.string(),
          evidenceRequired: z.string(),
          sampling: z.string(),
        }),
      ),
    }),
  ),
});

const SYSTEM_PROMPT = [
  "You are an experienced internal auditor writing the testing procedures for an AML/CFT audit at a",
  "Singapore capital markets firm.",
  "",
  "You are writing for a colleague who will perform this fieldwork. They know how to audit. What",
  "they need from you is what to test, against what criterion, and what to obtain as evidence.",
  "",
  "How you write a step:",
  "- It starts with a verb an auditor performs: inspect, reperform, trace, observe, recalculate.",
  "  'Assess the adequacy of' is not a procedure — it is the conclusion the procedure supports.",
  "- The evidence is a document or extract the auditor can actually request by name: the screening",
  "  system's match log, the CDD file, the monitoring rule configuration, the MLRO's escalation",
  "  register.",
  "- Sampling says how the population is defined and how items are selected. Where a full",
  "  population can be tested, say so instead.",
  "- The criterion is the obligation listed for that area. Test against what the instrument",
  "  requires, not against general good practice.",
].join("\n");

export interface EvidenceAgentResult {
  /** The same areas, with steps filled in on the approved ones. */
  areas: ScopeArea[];
  notes: string[];
  usage: UsageTotals;
}

export async function runEvidenceAgent(
  client: Anthropic,
  areas: ScopeArea[],
  riskFactors: RiskFactor[],
  obligations: Obligation[],
): Promise<EvidenceAgentResult> {
  const approved = areas.filter((area) => area.approved);
  if (approved.length === 0) {
    throw new Error("No scope area is approved, so there is nothing to draft steps for.");
  }

  const handles = new Map(approved.map((area, index) => [`A${index + 1}`, area]));
  const riskById = new Map(riskFactors.map((factor) => [factor.id, factor]));
  const obligationById = new Map(obligations.map((obligation) => [obligation.id, obligation]));

  const response = await client.beta.messages.parse({
    model: SYNTHESIS_MODEL,
    max_tokens: 12000,
    ...betaFieldsFor(SYNTHESIS_MODEL),
    output_config: { ...effortFor(SYNTHESIS_MODEL), format: zodOutputFormat(draftSchema) },
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildPrompt(handles, riskById, obligationById) },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Step drafting was declined by the model.");
  if (!response.parsed_output) throw new Error("Step drafting returned nothing usable.");

  const notes: string[] = [];
  if (response.stop_reason === "max_tokens") {
    notes.push("Drafting hit the output limit; later areas may have fewer steps than intended.");
  }

  const stepsByAreaId = new Map<string, AuditStep[]>();

  for (const raw of response.parsed_output.areas) {
    const area = handles.get(collapse(raw.areaId).toUpperCase());
    if (!area) {
      notes.push(`Ignored steps written for an unknown area (${clamp(collapse(raw.areaId), 20)}).`);
      continue;
    }

    const steps: AuditStep[] = [];
    for (const rawStep of raw.steps.slice(0, MAX_STEPS_PER_AREA)) {
      const procedure = collapse(rawStep.procedure);
      const evidenceRequired = collapse(rawStep.evidenceRequired);

      // A procedure with no named evidence cannot be performed as written.
      if (!procedure || !evidenceRequired) {
        notes.push(`Dropped a step under "${clamp(area.title, 50)}" — no evidence named.`);
        continue;
      }

      const sampling = collapse(rawStep.sampling);
      steps.push({
        id: hashId(`${area.id}:${procedure}`),
        procedure: clamp(procedure, 400),
        evidenceRequired: clamp(evidenceRequired, 300),
        ...(sampling ? { sampling: clamp(sampling, 300) } : {}),
      });
    }

    if (steps.length === 0) {
      notes.push(`No usable step was drafted for "${clamp(area.title, 50)}".`);
      continue;
    }
    stepsByAreaId.set(area.id, steps);
  }

  if (stepsByAreaId.size === 0) {
    throw new Error("No testing step survived checking, so the programme was not completed.");
  }

  // Rejected areas keep their empty step list rather than disappearing: the
  // record of what was considered and declined is part of the audit trail.
  return {
    areas: areas.map((area) => ({ ...area, steps: stepsByAreaId.get(area.id) ?? area.steps })),
    notes,
    usage: usageFrom(response),
  };
}

function buildPrompt(
  handles: Map<string, ScopeArea>,
  riskById: Map<string, RiskFactor>,
  obligationById: Map<string, Obligation>,
): string {
  const blocks = [...handles].map(([handle, area]) => {
    const risks = area.addressesRiskFactors.flatMap((id) => {
      const factor = riskById.get(id);
      return factor ? [`  - Risk: ${factor.factor}`] : [];
    });
    const criteria = area.testsObligations.flatMap((id) => {
      const obligation = obligationById.get(id);
      return obligation ? [`  - Criterion: ${obligation.reference} — ${obligation.requirement}`] : [];
    });

    return [
      `### ${handle} — ${area.title}  [${area.riskRating} priority]`,
      `  ${area.rationale}`,
      ...risks,
      ...criteria,
    ].join("\n");
  });

  return [
    "Write the testing procedures for the approved areas below. Areas the auditor did not approve",
    "are not listed and must not be invented.",
    "",
    ...blocks,
    "",
    "## Your task",
    "For each area, return its handle as `areaId` and three to five steps. For each step:",
    "- `procedure` — what the auditor does, starting with the verb",
    "- `evidenceRequired` — the specific document, extract or system output to obtain",
    "- `sampling` — how the population is defined and items selected, or how a full-population test",
    "  would be run",
    "",
    "Weight your effort by priority: a high-priority area deserves the deeper testing. Do not repeat",
    "the same procedure under two areas — put it under the one where it belongs and let the other",
    "test a different aspect.",
  ].join("\n");
}
