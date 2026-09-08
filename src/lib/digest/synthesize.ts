import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { DIGEST_MODEL, FALLBACK_BETA } from "./client";
import { CATEGORIES } from "./categories";
import { digestDraftSchema, type DigestDraft } from "./schema";
import type { CategoryResearch, ResearchWindow, RetrievedSource } from "./research";
import { isPrimarySource } from "./sources";

const SYNTHESIS_SYSTEM_PROMPT = [
  "You are the editor of a weekly one-page briefing read by the Internal Audit team of a financial",
  "services firm in Singapore. The team reads it on Monday morning and needs to know, within seconds,",
  "what changed in their world last week.",
  "",
  "You are editing a colleague's research notes into the finished page. Your job is judgement:",
  "deciding what earns a place, and saying why it matters in plain language.",
  "",
  "How you write:",
  "- Plain English. An auditor with ten years of experience should never have to reread a sentence.",
  "- Specific. Name the regulator, the instrument, the date, the obligation. 'Increased focus on",
  "  governance' is not a finding; 'MAS gave firms until 30 June to evidence board-level AI oversight' is.",
  "- Honest about scale. Do not inflate a consultation paper into a mandate, or a pilot into a rollout.",
  "- No filler. Never write that something is 'significant', 'a key development', or 'worth monitoring'",
  "  without saying what it actually changes. If a synthesis would only restate its headline in longer",
  "  words, the entry does not belong in the digest — leave it out.",
  "",
  "A short digest is a good digest. Some weeks genuinely have three things worth reading.",
].join("\n");

export interface SynthesisResult {
  draft: DigestDraft;
  warnings: string[];
}

/**
 * Turns the per-category research notes into the structured digest.
 *
 * Structured output is used rather than prose-then-parse so the shape is
 * guaranteed by the API, and the schema's own length bounds do part of the
 * editorial work — a synthesis that is one line long fails validation.
 */
export async function synthesizeDigest(
  client: Anthropic,
  research: CategoryResearch[],
  window: ResearchWindow,
): Promise<SynthesisResult> {
  const allSources = research.flatMap((item) => item.sources);

  const response = await client.beta.messages.parse({
    model: DIGEST_MODEL,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(digestDraftSchema),
    },
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildSynthesisPrompt(research, window, allSources) }],
  });

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
      `Synthesis did not return a valid digest (stop reason: ${response.stop_reason ?? "unknown"}).`,
    );
  }

  const warnings: string[] = [];
  if (response.stop_reason === "max_tokens") {
    warnings.push("Synthesis hit the output limit; the edition may be incomplete.");
  }

  return { draft: parsed, warnings };
}

function buildSynthesisPrompt(
  research: CategoryResearch[],
  window: ResearchWindow,
  allSources: RetrievedSource[],
): string {
  const sections = research.map((item) => {
    const category = CATEGORIES.find((entry) => entry.id === item.category);
    return [
      `### ${category?.label ?? item.category}  (category id: \`${item.category}\`)`,
      item.notes.trim() || "_The researcher found nothing meeting the bar this week._",
    ].join("\n\n");
  });

  return [
    `You are producing the digest dated ${window.to}, covering ${window.from} to ${window.to}.`,
    "",
    "## Research notes",
    ...sections,
    "",
    "## Sources retrieved this week",
    "Every `sourceUrl` you output must be copied character-for-character from this list.",
    "An entry whose URL is not on this list will be discarded before publication.",
    "",
    formatSourceList(allSources),
    "",
    "## Your task",
    "Write the digest.",
    "",
    "`summary` is the lede: one or two sentences naming the single most consequential thing that",
    "happened this week and what it means for the team. It is the one thing a reader who stops after",
    "the first paragraph should walk away with. Do not list the categories; do not say 'this week's",
    "digest covers'.",
    "",
    "For each entry:",
    "- `headline` — plain language, no jargon padding, reads as a statement of what happened.",
    "- `synthesis` — two to three sentences. What the source says, then what it changes for an internal",
    "  audit function. If you cannot write the second half without resorting to generalities, drop the",
    "  entry entirely.",
    "- `sourceName` — the publishing organisation, as a reader would name it (e.g. 'MAS', 'Deloitte').",
    "- `sourceUrl` — copied exactly from the list above.",
    "- `publishedAt` — the source's publication date as YYYY-MM-DD. Omit the field if the notes did not",
    "  establish one. Never guess.",
    "- `category` — one of the category ids above; use the category the item was researched under.",
    "",
    "Order entries within each category with the most consequential first. Prefer primary sources when",
    "the same development appears in more than one place. Aim for six to nine entries in total, but",
    "publish fewer rather than including anything that does not earn its place.",
  ].join("\n");
}

function formatSourceList(sources: RetrievedSource[]): string {
  if (sources.length === 0) return "_No sources were retrieved._";

  // Primary sources first, so the model reaches for the regulator's own page
  // ahead of the trade-press write-up of it.
  const ordered = [...sources].sort((a, b) => {
    const rank = Number(isPrimarySource(b.url)) - Number(isPrimarySource(a.url));
    return rank !== 0 ? rank : a.url.localeCompare(b.url);
  });

  return ordered
    .map((source) => {
      const age = source.pageAge ? ` (published ${source.pageAge} ago)` : "";
      return `- ${source.url}\n  ${source.title}${age}`;
    })
    .join("\n");
}
