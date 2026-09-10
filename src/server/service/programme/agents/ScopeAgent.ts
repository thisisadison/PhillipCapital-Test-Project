import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SYNTHESIS_MODEL } from "@/server/service/AnthropicClient";
import { usageFrom, type UsageTotals } from "@/server/service/UsageTracking";
import type { Obligation, RiskFactor, ScopeArea } from "@/server/domain/programme";
import { RISK_ORDER } from "@/server/domain/programme";
import { describeIntake, type RiskIntake } from "@/server/domain/riskIntake";
import { betaFieldsFor, clamp, collapse, effortFor, hashId, normaliseRisk } from "./shared";

/**
 * Scope Agent — merges what the firm is exposed to with what it must comply
 * with, and proposes the control areas an audit would cover.
 *
 * This is the agent whose output the auditor actually steers. It produces
 * areas, not procedures: a decision about where the fieldwork goes, which is
 * exactly the decision a human should own. Nothing is drafted in detail until
 * these are approved.
 *
 * Every area must cite at least one risk factor and at least one obligation.
 * That constraint is the whole design: an area that answers no assessed risk is
 * boilerplate, and one that tests no obligation has no criteria to test against.
 * Either way it is dropped rather than shown.
 */

const MAX_AREAS = 8;

const draftSchema = z.object({
  scopeSummary: z.string(),
  areas: z.array(
    z.object({
      title: z.string(),
      riskRating: z.string(),
      rationale: z.string(),
      /** Handles from the lists in the prompt, e.g. `R2`. Never free text. */
      addressesRiskFactors: z.array(z.string()),
      testsObligations: z.array(z.string()),
    }),
  ),
});

const SYSTEM_PROMPT = [
  "You are an internal audit manager scoping an AML/CFT audit at a Singapore capital markets firm.",
  "",
  "You are given an assessment of what this firm is exposed to, and the obligations it is subject",
  "to. You decide where the fieldwork goes: which control areas this audit will cover, in what",
  "order of priority, and why each one earns a place.",
  "",
  "How you scope:",
  "- Every area answers at least one assessed risk factor and tests at least one obligation. An",
  "  area that does neither is standard-programme filler and does not belong in this audit.",
  "- Risk rating is the audit's own priority call — how much of the fieldwork budget this area",
  "  deserves at this firm — not a restatement of the highest risk factor it touches.",
  "- Prefer fewer, better-defined areas. Six areas an auditor can resource beats twelve that",
  "  fragment the same testing.",
  "- The rationale names this firm's circumstances. If it would read identically for any brokerage",
  "  in Singapore, it is not a rationale.",
].join("\n");

export interface ScopeAgentResult {
  scopeSummary: string;
  areas: ScopeArea[];
  notes: string[];
  usage: UsageTotals;
}

export async function runScopeAgent(
  client: Anthropic,
  intake: RiskIntake,
  riskFactors: RiskFactor[],
  obligations: Obligation[],
): Promise<ScopeAgentResult> {
  // Short handles rather than the hashed ids: the model reasons about `R2` far
  // more reliably than about a twelve-character hex string, and the mapping back
  // is exact, so an invented handle simply fails to resolve.
  const riskHandles = new Map(riskFactors.map((factor, index) => [`R${index + 1}`, factor]));
  const obligationHandles = new Map(
    obligations.map((obligation, index) => [`O${index + 1}`, obligation]),
  );

  const response = await client.beta.messages.parse({
    model: SYNTHESIS_MODEL,
    max_tokens: 8000,
    ...betaFieldsFor(SYNTHESIS_MODEL),
    output_config: { ...effortFor(SYNTHESIS_MODEL), format: zodOutputFormat(draftSchema) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildPrompt(intake, riskHandles, obligationHandles),
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("Scoping was declined by the model.");
  if (!response.parsed_output) throw new Error("Scoping returned nothing usable.");

  const notes: string[] = [];
  const areas: ScopeArea[] = [];
  const seen = new Set<string>();

  for (const raw of response.parsed_output.areas.slice(0, MAX_AREAS)) {
    const title = collapse(raw.title);
    const rationale = collapse(raw.rationale);
    if (!title || !rationale) continue;

    if (seen.has(title.toLowerCase())) {
      notes.push(`Merged a duplicate of "${title}".`);
      continue;
    }

    const addressesRiskFactors = resolve(raw.addressesRiskFactors, riskHandles).map((f) => f.id);
    const testsObligations = resolve(raw.testsObligations, obligationHandles).map((o) => o.id);

    // The linkage constraint, enforced here rather than asked for: structured
    // outputs do not enforce array contents, so a model that ignores the
    // instruction has to be caught after the fact.
    if (addressesRiskFactors.length === 0 || testsObligations.length === 0) {
      notes.push(
        `Dropped "${clamp(title, 60)}" — it cited ${
          addressesRiskFactors.length === 0 ? "no assessed risk" : "no obligation to test against"
        }.`,
      );
      continue;
    }

    seen.add(title.toLowerCase());
    areas.push({
      id: hashId(title),
      title: clamp(title, 120),
      riskRating: normaliseRisk(raw.riskRating),
      rationale: clamp(rationale, 600),
      addressesRiskFactors: addressesRiskFactors.slice(0, 8),
      testsObligations: testsObligations.slice(0, 8),
      // Approved by default: the checkpoint is a review, not a data-entry task.
      // Unticking an area is how the auditor spends the next stage's budget
      // somewhere else.
      approved: true,
      steps: [],
    });
  }

  if (areas.length === 0) {
    throw new Error("No scope area could be linked to both a risk factor and an obligation.");
  }

  areas.sort((a, b) => RISK_ORDER[a.riskRating] - RISK_ORDER[b.riskRating]);

  const scopeSummary = collapse(response.parsed_output.scopeSummary);
  return {
    scopeSummary: scopeSummary
      ? clamp(scopeSummary, 600)
      : `${areas.length} control areas covering ${riskFactors.length} assessed risk factors.`,
    areas,
    notes,
    usage: usageFrom(response),
  };
}

function resolve<T>(handles: string[], catalogue: Map<string, T>): T[] {
  const found: T[] = [];
  for (const handle of handles) {
    const entry = catalogue.get(collapse(handle).toUpperCase());
    if (entry && !found.includes(entry)) found.push(entry);
  }
  return found;
}

function buildPrompt(
  intake: RiskIntake,
  riskHandles: Map<string, RiskFactor>,
  obligationHandles: Map<string, Obligation>,
): string {
  const risks = [...riskHandles].map(
    ([handle, factor]) =>
      `- ${handle} [${factor.severity}] ${factor.factor}\n  ${factor.rationale}`,
  );
  const obligations = [...obligationHandles].map(
    ([handle, obligation]) => `- ${handle} ${obligation.reference} — ${obligation.requirement}`,
  );

  return [
    "Scope the AML/CFT audit for this firm.",
    "",
    "## The firm",
    describeIntake(intake),
    "",
    "## Assessed risk factors",
    ...risks,
    "",
    "## Applicable obligations",
    ...obligations,
    "",
    "## Your task",
    "Return `scopeSummary`: two sentences stating what this audit covers and what shaped it. Write",
    "it for an audit committee paper — no preamble, no restating the question.",
    "",
    "Then return four to seven control areas. For each:",
    "- `title` — the control area, as it would appear on the programme, e.g. 'Beneficial ownership",
    "  identification for corporate accounts'",
    "- `riskRating` — `high`, `medium` or `low`: the fieldwork priority you assign it",
    "- `rationale` — two sentences on why this area is in scope at this firm specifically",
    "- `addressesRiskFactors` — the R handles above that this area answers",
    "- `testsObligations` — the O handles above that this area tests",
    "",
    "Use only the handles listed above. An area you cannot tie to both a risk factor and an",
    "obligation should not be returned at all.",
  ].join("\n");
}
