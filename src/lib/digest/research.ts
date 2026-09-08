import type Anthropic from "@anthropic-ai/sdk";
import { DIGEST_MODEL, FALLBACK_BETA } from "./client";
import { getCategory, type CategoryDefinition, type CategoryId } from "./categories";
import { ALLOWED_DOMAINS_BY_CATEGORY, MAX_ALLOWED_DOMAINS } from "./sources";

/** A page the search tool actually returned. The grounding set is built from these. */
export interface RetrievedSource {
  url: string;
  title: string;
  /** Relative age reported by the search tool, e.g. "3 days". Null when unknown. */
  pageAge: string | null;
}

export interface CategoryResearch {
  category: CategoryId;
  /** The analyst's prose findings, handed to the synthesis step. */
  notes: string;
  sources: RetrievedSource[];
  warnings: string[];
}

export interface ResearchWindow {
  /** Inclusive `YYYY-MM-DD` lower bound. */
  from: string;
  /** Inclusive `YYYY-MM-DD` upper bound — the edition date. */
  to: string;
}

/** Guard against a runaway server-tool loop pausing forever. */
const MAX_PAUSE_CONTINUATIONS = 4;
const MAX_SEARCHES_PER_CATEGORY = 8;

const RESEARCH_SYSTEM_PROMPT = [
  "You are a research analyst for the Internal Audit function of a financial services firm in Singapore.",
  "Your readers are experienced internal auditors. They do not need audit concepts explained to them,",
  "and they have no patience for vendor marketing or restated press releases.",
  "",
  "You find developments that change something for an audit function: what it must test, what it must",
  "evidence, what it should put on next year's plan, or what it can now do differently. A development",
  "that changes nothing for them is not a finding, however prominent it is.",
  "",
  "Work from the search results only. Never state a URL that did not appear in a search result,",
  "and never infer a publication date that the result did not show you.",
].join("\n");

/**
 * Runs the research step for one category.
 *
 * Search is restricted to the category's allowlist of primary and established
 * sources (see `sources.ts`), so candidate selection is constrained before the
 * model ever exercises judgement.
 */
export async function researchCategory(
  client: Anthropic,
  categoryId: CategoryId,
  window: ResearchWindow,
): Promise<CategoryResearch> {
  const category = getCategory(categoryId);
  const allowedDomains = ALLOWED_DOMAINS_BY_CATEGORY[categoryId].slice(0, MAX_ALLOWED_DOMAINS);

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: buildResearchPrompt(category, window) },
  ];

  const warnings: string[] = [];
  const sources = new Map<string, RetrievedSource>();
  const textParts: string[] = [];

  for (let attempt = 0; attempt <= MAX_PAUSE_CONTINUATIONS; attempt += 1) {
    const response = await client.beta.messages.create({
      model: DIGEST_MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: RESEARCH_SYSTEM_PROMPT,
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: MAX_SEARCHES_PER_CATEGORY,
          allowed_domains: allowedDomains,
        },
      ],
      messages,
    });

    collectSources(response.content, sources, warnings, category.label);
    textParts.push(...extractText(response.content));

    if (response.stop_reason === "refusal") {
      // The whole fallback chain declined. Treat as a hard failure for this
      // category rather than silently publishing a thin edition.
      throw new Error(
        `Research for "${category.label}" was declined by the model` +
          `${response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : "."}`,
      );
    }

    if (response.stop_reason !== "pause_turn") {
      if (response.stop_reason === "max_tokens") {
        warnings.push(`Research for "${category.label}" hit the output limit and may be truncated.`);
      }
      break;
    }

    // A paused turn is resumed by echoing the partial assistant turn back.
    messages.push({ role: "assistant", content: response.content });

    if (attempt === MAX_PAUSE_CONTINUATIONS) {
      warnings.push(`Research for "${category.label}" was still paused after ${attempt + 1} turns.`);
    }
  }

  const notes = textParts.join("\n\n").trim();
  if (!notes) {
    warnings.push(`Research for "${category.label}" produced no findings.`);
  }

  return { category: categoryId, notes, sources: [...sources.values()], warnings };
}

function buildResearchPrompt(category: CategoryDefinition, window: ResearchWindow): string {
  return [
    `Today is ${window.to}. Research this topic for the week of ${window.from} to ${window.to}:`,
    "",
    `## ${category.label}`,
    category.researchBrief,
    "",
    "## What to look for",
    `Developments published or announced between ${window.from} and ${window.to}. An item published`,
    "slightly earlier is acceptable only if something in this window made it newly consequential —",
    "say so explicitly if you include one.",
    "",
    "## Selection",
    "Return at most 4 findings, and fewer whenever fewer are warranted. Returning two genuine",
    "developments is a better outcome than padding to four. Explicitly exclude:",
    "- vendor announcements with no substance behind them,",
    "- commentary that restates a development already covered by its primary source,",
    "- undated 'thought leadership' with no news hook,",
    "- anything an experienced internal auditor already knows.",
    "",
    "If nothing in this window meets the bar, say so plainly and return no findings.",
    "",
    "## Output",
    "For each finding, write a short block containing:",
    "- SOURCE_URL: the exact URL from a search result",
    "- PUBLISHER: the organisation that published it",
    "- PUBLISHED: the publication date as YYYY-MM-DD, or `unknown` if the result did not show one",
    "- WHAT: what the source actually says, in specifics — name the instrument, the date, the obligation",
    "- SO_WHAT: what changes for an internal audit function as a result, concretely",
    "",
    "Write prose, not JSON. This is working material for a colleague who will edit it.",
  ].join("\n");
}

function collectSources(
  content: Anthropic.Beta.BetaContentBlock[],
  into: Map<string, RetrievedSource>,
  warnings: string[],
  categoryLabel: string,
): void {
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;

    // Server-tool errors arrive as HTTP 200 with an error object in place of
    // the usual result array, so branch on the shape before iterating.
    if (!Array.isArray(block.content)) {
      warnings.push(
        `A web search for "${categoryLabel}" failed (${block.content.error_code}).`,
      );
      continue;
    }

    for (const result of block.content) {
      if (result.type !== "web_search_result") continue;
      into.set(result.url, {
        url: result.url,
        title: result.title,
        pageAge: result.page_age,
      });
    }
  }
}

function extractText(content: Anthropic.Beta.BetaContentBlock[]): string[] {
  return content.flatMap((block) => (block.type === "text" ? [block.text] : []));
}
