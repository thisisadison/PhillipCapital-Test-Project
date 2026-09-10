import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { RESEARCH_MODEL } from "@/server/service/AnthropicClient";
import { usageFrom, type UsageTotals } from "@/server/service/UsageTracking";
import type { RiskFactor } from "@/server/domain/programme";
import {
  fallbackDimension,
  resolveDimensionId,
  type AuditDomain,
} from "@/server/domain/auditDomain";
import { describeIntake, type RiskIntake } from "@/server/domain/riskIntake";
import { betaFieldsFor, clamp, collapse, effortFor, hashId, normaliseRisk } from "./shared";

/**
 * Risk Agent — turns the intake selections into assessed risk factors.
 *
 * Deliberately has no tools. Its job is judgement about the firm in front of
 * it, not research: what does this combination of answers actually expose the
 * firm to. Keeping it toolless makes it the cheapest agent in the pipeline and
 * lets it run in parallel with the Obligations Agent, which is the one that
 * needs the network.
 *
 * Everything domain-specific arrives through `domain` — who the specialist is,
 * and what the dimensions are called. The judgement rules below hold for any
 * audit, which is why they live here rather than in each domain file.
 */

const MIN_RATIONALE = 40;
const MAX_FACTORS = 10;

const draftSchema = z.object({
  factors: z.array(
    z.object({
      factor: z.string(),
      severity: z.string(),
      /** One of the domain's dimension ids. Resolved leniently — enums are not enforced. */
      dimension: z.string(),
      drivenBy: z.array(z.string()),
      rationale: z.string(),
    }),
  ),
});

function systemPrompt(domain: AuditDomain): string {
  return [
    domain.riskBrief,
    "",
    "What makes a factor worth returning:",
    "- It follows from the selections given, not from generic commentary about this subject. If",
    "  nothing in the intake implicates a risk, do not return it.",
    "- It is specific about the mechanism. Name how the exposure actually arises, not the category",
    "  it belongs to. A heading is not a finding.",
    "- The strongest factors come from a *combination* of dimensions, because that is where real",
    "  exposure lives — two answers that are unremarkable alone are often serious together.",
    "  Prefer those.",
    "- Severity reflects this firm's exposure, not the topic's importance in the abstract.",
    "",
    "Be honest when a selection is low risk. Saying so is more useful to an audit function than",
    "inflating it, because an audit plan built on inflated ratings spends its fieldwork budget in",
    "the wrong place.",
  ].join("\n");
}

export interface RiskAgentResult {
  factors: RiskFactor[];
  notes: string[];
  usage: UsageTotals;
}

export async function runRiskAgent(
  client: Anthropic,
  domain: AuditDomain,
  intake: RiskIntake,
): Promise<RiskAgentResult> {
  const dimensionIds = domain.dimensions.map((dimension) => `\`${dimension.id}\``).join(", ");

  const response = await client.beta.messages.parse({
    model: RESEARCH_MODEL,
    max_tokens: 6000,
    ...betaFieldsFor(RESEARCH_MODEL),
    output_config: { ...effortFor(RESEARCH_MODEL), format: zodOutputFormat(draftSchema) },
    system: systemPrompt(domain),
    messages: [
      {
        role: "user",
        content: [
          "Assess the risk factors for this firm.",
          "",
          "## The firm's risk profile",
          describeIntake(intake),
          "",
          "## Output",
          "For each factor return:",
          "- `factor` — the exposure, stated in one line",
          "- `severity` — `high`, `medium` or `low` for this firm specifically",
          `- \`dimension\` — the dimension it primarily arises from: ${dimensionIds}`,
          "- `drivenBy` — the intake selections that produce it, quoted as they appear above",
          "- `rationale` — two sentences on the mechanism: how the exposure actually arises",
          "",
          "Return five to eight factors, and cover more than one dimension. Fewer is correct when",
          "the profile is genuinely simple.",
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
      dimension: resolveDimensionId(domain, raw.dimension) ?? fallbackDimension(domain).id,
      drivenBy: raw.drivenBy
        .map((value: string) => clamp(collapse(value), 60))
        .filter(Boolean)
        .slice(0, 6),
      rationale: clamp(rationale, 500),
    });
  }

  return { factors, notes, usage: usageFrom(response) };
}
