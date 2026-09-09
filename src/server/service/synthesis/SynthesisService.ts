import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { FALLBACK_BETA, SYNTHESIS_MODEL } from "../AnthropicClient";
import { formatUsageLine, usageFrom, type UsageTotals } from "../UsageTracking";
import { CATEGORIES } from "@/server/domain/category";
import type { CategoryResearch, ResearchWindow } from "../research/ResearchService";
import { draftSchema, type Draft } from "./draftSchema";
import type { SourceIndex } from "./sourceIndex";

const SYSTEM_PROMPT = [
  "You are the editor of a weekly briefing read by the Internal Audit team of a financial services",
  "firm in Singapore. The team reads it on Monday morning and needs to know, within seconds, what",
  "changed in their world last week.",
  "",
  "You are editing a colleague's research notes into the finished page. Your job is judgement:",
  "deciding what earns a place, and saying why it matters in plain language.",
  "",
  "How you write:",
  "- Plain English. An auditor with ten years of experience should never have to reread a sentence.",
  "- Specific. Name the regulator, the instrument, the date, the obligation. 'Increased focus on",
  "  governance' is not a finding; 'MAS gave firms until 30 June to evidence board-level AI",
  "  oversight' is.",
  "- Honest about scale. Do not inflate a consultation paper into a mandate, or a pilot into a rollout.",
  "- No filler. Never write that something is 'significant' or 'worth monitoring' without saying what",
  "  it actually changes. If a synthesis would only restate its headline in longer words, drop the",
  "  entry instead.",
  "",
  "A short digest is a good digest. Some weeks genuinely have four things worth reading.",
].join("\n");

export interface SynthesisResult {
  draft: Draft;
  warnings: string[];
  usage: UsageTotals;
}

/**
 * Turns the per-category research notes into one structured draft.
 *
 * The draft is intentionally not the published shape: it is checked, coerced
 * and filtered by `normaliseDraft` before anything reaches storage.
 */
export async function synthesizeDigest(
  client: Anthropic,
  research: CategoryResearch[],
  sources: SourceIndex,
  window: ResearchWindow,
): Promise<SynthesisResult> {
  const response = await client.beta.messages.parse({
    model: SYNTHESIS_MODEL,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: zodOutputFormat(draftSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(research, sources, window) }],
  });

  const usage = usageFrom(response);

  if (response.stop_reason === "refusal") {
    throw new Error(
      `Synthesis was declined by the model${
        response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : "."
      }`,
    );
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error(
      `Synthesis did not return a usable draft (stop reason: ${response.stop_reason ?? "unknown"}).`,
    );
  }

  const warnings: string[] = [];
  if (response.stop_reason === "max_tokens") {
    warnings.push("Synthesis hit the output limit; the edition may be incomplete.");
  }

  console.log(`[synthesis] ${formatUsageLine(usage, SYNTHESIS_MODEL)}`);

  return { draft: parsed, warnings, usage };
}

function buildPrompt(
  research: CategoryResearch[],
  sources: SourceIndex,
  window: ResearchWindow,
): string {
  const sections = research.map((item) => {
    const category = CATEGORIES.find((entry) => entry.id === item.category);
    return [
      `### ${category?.label ?? item.category}  (category id: \`${item.category}\`)`,
      item.notes.trim() || "_The researcher found nothing meeting the bar this week._",
    ].join("\n\n");
  });

  const categoryList = CATEGORIES.map((category) => `\`${category.id}\` — ${category.label}`).join(
    "\n",
  );

  return [
    `You are producing the digest dated ${window.to}, covering ${window.from} to ${window.to}.`,
    "",
    "## Research notes",
    ...sections,
    "",
    "## Source catalogue",
    "These are the only sources you may cite. Reference one by its id — you never write a URL.",
    "",
    sources.format(),
    "",
    "## Categories",
    categoryList,
    "",
    "## Your task",
    "Write the digest.",
    "",
    "`summary` is the lede: one or two sentences naming the single most consequential thing that",
    "happened this week and what it means for the team. It is what a reader who stops after the first",
    "paragraph should walk away with. Do not list the categories or say 'this digest covers'.",
    "",
    "For each entry:",
    "- `sourceId` — the catalogue id, e.g. `S07`. Must be one from the list above.",
    "- `category` — one of the category ids above.",
    "- `headline` — plain language, a statement of what happened. Aim for under 100 characters.",
    "- `synthesis` — two to three sentences. What the source says, then what it changes for an",
    "  internal audit function. If you cannot write the second half without generalities, drop it.",
    "- `actionRequired` — one sentence naming the most useful thing the audit function should do.",
    "  Concrete: what to test, ask for, or put on the plan. Not 'monitor developments'.",
    "- `impact` — `act-now` for a dated obligation or live exposure, `plan-for` if it shapes the next",
    "  planning or budget cycle, `watch` if it is worth knowing but needs nothing yet. Be honest:",
    "  most weeks are mostly `watch`.",
    "- `affects` — up to three short area tags, e.g. `Model risk`, `Third-party`, `AML`, `ITGC`.",
    "- `publishedAt` — the source's publication date as YYYY-MM-DD. Omit if the notes did not",
    "  establish one. Never guess.",
    "",
    "Order entries with the most consequential first. Prefer primary sources when the same",
    "development appears in more than one place. Aim for eight to twelve entries across all",
    "categories, but publish fewer rather than including anything that does not earn its place.",
  ].join("\n");
}
