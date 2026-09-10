import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { RESEARCH_MODEL } from "@/server/service/AnthropicClient";
import { usageFrom, type UsageTotals } from "@/server/service/UsageTracking";
import type { RiskFactor } from "@/server/domain/programme";
import { describeIntake, type RiskIntake } from "@/server/domain/riskIntake";
import { betaFieldsFor, clamp, collapse, effortFor, hashId, normaliseRisk } from "./shared";

/**
 * Risk Agent — turns the intake selections into assessed risk factors.
 *
 * Deliberately has no tools. Its job is judgement about the firm in front of
 * it, not research: what does this combination of business lines, clients and
 * channels actually expose the firm to. Keeping it toolless makes it the
 * cheapest agent in the pipeline and lets it run in parallel with the MAS Agent,
 * which is the one that needs the network.
 */

const MIN_RATIONALE = 40;
const MAX_FACTORS = 10;

const draftSchema = z.object({
  factors: z.array(
    z.object({
      factor: z.string(),
      severity: z.string(),
      drivenBy: z.array(z.string()),
      rationale: z.string(),
    }),
  ),
});

const SYSTEM_PROMPT = [
  "You are a financial crime risk specialist assessing a Singapore capital markets firm on behalf",
  "of its Internal Audit function.",
  "",
  "You are given what the firm does, who it onboards, how, and what its auditors already consider",
  "a concern. You return the money-laundering and terrorism-financing risk factors that this",
  "particular combination creates.",
  "",
  "What makes a factor worth returning:",
  "- It follows from the selections given, not from generic AML commentary. If nothing in the",
  "  intake implicates cash handling, do not return a cash risk.",
  "- It is specific about the mechanism. 'Third-party introducers perform CDD the firm must still",
  "  stand behind' is a factor; 'onboarding risk' is a category.",
  "- Severity reflects this firm's exposure, not the topic's importance in the abstract.",
  "",
  "Be honest when a selection is low risk. A firm that onboards Singapore residents in person",
  "through its own staff has a genuinely smaller onboarding exposure, and saying so is more useful",
  "than inflating it.",
].join("\n");

export interface RiskAgentResult {
  factors: RiskFactor[];
  notes: string[];
  usage: UsageTotals;
}

export async function runRiskAgent(
  client: Anthropic,
  intake: RiskIntake,
): Promise<RiskAgentResult> {
  const response = await client.beta.messages.parse({
    model: RESEARCH_MODEL,
    max_tokens: 6000,
    ...betaFieldsFor(RESEARCH_MODEL),
    output_config: { ...effortFor(RESEARCH_MODEL), format: zodOutputFormat(draftSchema) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          "Assess the AML/CFT risk factors for this firm.",
          "",
          describeIntake(intake),
          "",
          "For each factor return:",
          "- `factor` — the exposure, stated in one line",
          "- `severity` — `high`, `medium` or `low` for this firm specifically",
          "- `drivenBy` — the intake selections that produce it, quoted as they appear above",
          "- `rationale` — two sentences on the mechanism: how the exposure actually arises",
          "",
          "Return four to eight factors. Fewer is correct when the profile is genuinely simple.",
        ].join("\n"),
      },
    ],
  });

  const notes: string[] = [];
  if (response.stop_reason === "refusal") throw new Error("The risk assessment was declined.");
  if (!response.parsed_output) throw new Error("The risk assessment returned nothing usable.");

  const factors: RiskFactor[] = [];
  const seen = new Set<string>();

  for (const raw of response.parsed_output.factors.slice(0, MAX_FACTORS)) {
    const factor = collapse(raw.factor);
    const rationale = collapse(raw.rationale);

    // A factor with no explained mechanism is a category heading, not a finding.
    if (!factor || rationale.length < MIN_RATIONALE) {
      notes.push(`Dropped "${factor || "untitled"}" — no mechanism explained.`);
      continue;
    }
    if (seen.has(factor.toLowerCase())) continue;
    seen.add(factor.toLowerCase());

    factors.push({
      id: hashId(factor),
      factor: clamp(factor, 140),
      severity: normaliseRisk(raw.severity),
      drivenBy: raw.drivenBy
        .map((value: string) => clamp(collapse(value), 60))
        .filter(Boolean)
        .slice(0, 6),
      rationale: clamp(rationale, 500),
    });
  }

  return { factors, notes, usage: usageFrom(response) };
}
