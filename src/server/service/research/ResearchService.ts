import type Anthropic from "@anthropic-ai/sdk";
import { FALLBACK_BETA, RESEARCH_MODEL, supportsNewerRequestFeatures } from "../AnthropicClient";
import { addUsage, formatUsageLine, usageFrom, ZERO_USAGE, type UsageTotals } from "../UsageTracking";
import { getCategory, type CategoryDefinition, type CategoryId } from "@/server/domain/category";
import { ALLOWED_DOMAINS_BY_CATEGORY, MAX_ALLOWED_DOMAINS } from "./sourceCatalogue";

/** A page the search tool actually returned. Every published link comes from one of these. */
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
  usage: UsageTotals;
}

export interface ResearchWindow {
  /** Inclusive `YYYY-MM-DD` lower bound. */
  from: string;
  /** Inclusive `YYYY-MM-DD` upper bound — the edition date. */
  to: string;
}

/**
 * Guards against a runaway server-tool loop pausing forever. Each continuation
 * resends the whole conversation so far, so this is also the main cost lever —
 * three turns rather than five caps the worst case at 3/5 of what it was.
 */
const MAX_PAUSE_CONTINUATIONS = 2;

/**
 * Searches are billed at roughly a cent each, but the real cost is that the
 * retrieved page content bills as input tokens on the turn it arrives *and on
 * every later turn of the same conversation*. Three focused searches per
 * category is the setting that matters most for spend — raise it only if
 * findings are visibly thin.
 */
const MAX_SEARCHES_PER_CATEGORY = numberFromEnv("DIGEST_MAX_SEARCHES_PER_CATEGORY", 3);

/** Research notes are prose summaries, not documents — this caps a runaway turn. */
const RESEARCH_MAX_TOKENS = numberFromEnv("DIGEST_RESEARCH_MAX_TOKENS", 8000);

function numberFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]?.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SYSTEM_PROMPT = [
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
 * sources, so candidate selection is constrained before the model exercises any
 * judgement.
 */
export async function researchCategory(
  client: Anthropic,
  categoryId: CategoryId,
  window: ResearchWindow,
): Promise<CategoryResearch> {
  const category = getCategory(categoryId);
  const allowedDomains = ALLOWED_DOMAINS_BY_CATEGORY[categoryId].slice(0, MAX_ALLOWED_DOMAINS);

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: buildPrompt(category, window) },
  ];

  const warnings: string[] = [];
  const sources = new Map<string, RetrievedSource>();
  const textParts: string[] = [];
  let usage: UsageTotals = ZERO_USAGE;
  const newerFeatures = supportsNewerRequestFeatures(RESEARCH_MODEL);

  for (let attempt = 0; attempt <= MAX_PAUSE_CONTINUATIONS; attempt += 1) {
    const response = await client.beta.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: RESEARCH_MAX_TOKENS,
      // Refusal fallback, adaptive thinking and `effort` are all absent on
      // Haiku 4.5 — see `supportsNewerRequestFeatures`. Sending any of them
      // there is a 400, not a no-op, so they're included as one group or not
      // at all rather than guessed at individually.
      ...(newerFeatures
        ? {
            betas: [FALLBACK_BETA],
            fallbacks: "default" as const,
            thinking: { type: "adaptive" as const },
            // Research is mostly tool-calling and extraction, not prose, so
            // medium effort finds much the same things as high for
            // meaningfully less thinking-token spend.
            output_config: { effort: "medium" as const },
          }
        : {}),
      // The system prompt is identical on every turn of this loop, and across
      // every category — caching it means only the first call anywhere in the
      // run pays full price; every later call, in this category or another,
      // reads it back at roughly a tenth of the cost.
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
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

    usage = addUsage(usage, usageFrom(response));
    collectSources(response.content, sources, warnings, category.label);
    textParts.push(
      ...response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])),
    );

    if (response.stop_reason === "refusal") {
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

    // A paused turn is resumed by echoing the partial assistant turn back, with
    // a cache breakpoint on its tail — see `withCacheBreakpoint`.
    messages.push({ role: "assistant", content: withCacheBreakpoint(response.content) });

    if (attempt === MAX_PAUSE_CONTINUATIONS) {
      warnings.push(`Research for "${category.label}" was still paused after ${attempt + 1} turns.`);
    }
  }

  const notes = textParts.join("\n\n").trim();
  if (!notes) warnings.push(`Research for "${category.label}" produced no findings.`);

  // Printed as each category finishes — categories run concurrently, so these
  // interleave, but each line is a real, complete number rather than a guess.
  console.log(`[research] ${category.label}: ${formatUsageLine(usage, RESEARCH_MODEL)}`);

  return { category: categoryId, notes, sources: [...sources.values()], warnings, usage };
}

/**
 * Marks everything up to the end of this turn as cacheable.
 *
 * Retrieved search results bill as input tokens on the turn they arrive and on
 * every later turn of the conversation, which with multiple continuations is
 * the largest avoidable cost in the pipeline. A breakpoint here means each
 * continuation reads the prior turns back at roughly a tenth of the price
 * rather than paying full freight for them again.
 *
 * The casts are because response blocks and request blocks are separate types
 * in the SDK: the request variants carry `cache_control`, the response
 * variants do not, and this is the seam where one becomes the other.
 */
function withCacheBreakpoint(
  content: Anthropic.Beta.BetaContentBlock[],
): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks = [...content] as Anthropic.Beta.BetaContentBlockParam[];
  const lastIndex = blocks.length - 1;
  const last = blocks[lastIndex];

  if (last) {
    blocks[lastIndex] = {
      ...last,
      cache_control: { type: "ephemeral" },
    } as Anthropic.Beta.BetaContentBlockParam;
  }
  return blocks;
}

function buildPrompt(category: CategoryDefinition, window: ResearchWindow): string {
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
    "Return at most 4 findings, and fewer whenever fewer are warranted. Two genuine developments is a",
    "better outcome than four padded ones. Explicitly exclude:",
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
    "- ACTION: the single most useful thing the audit function should do about it",
    "- AFFECTS: up to three areas it lands on (e.g. Model risk, Third-party, AML, ITGC, Board reporting)",
    "- IMPACT: one of `act-now` (a dated obligation or live exposure), `plan-for` (shapes the next",
    "  plan or budget cycle), or `watch` (worth knowing, no action yet)",
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
      warnings.push(`A web search for "${categoryLabel}" failed (${block.content.error_code}).`);
      continue;
    }

    for (const result of block.content) {
      if (result.type !== "web_search_result") continue;
      into.set(result.url, { url: result.url, title: result.title, pageAge: result.page_age });
    }
  }
}
