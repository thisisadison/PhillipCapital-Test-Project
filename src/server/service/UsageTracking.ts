import type Anthropic from "@anthropic-ai/sdk";
import { RESEARCH_MODEL, SYNTHESIS_MODEL } from "./AnthropicClient";

/**
 * Token accounting across the pipeline.
 *
 * This exists because the pipeline previously gave no visibility into what a
 * run actually cost — the first sign of trouble was a surprising bill, not a
 * number in the terminal. Every call's usage is logged as it completes and
 * summed into a total the CLI prints at the end.
 *
 * The estimate is exactly that: rates are current as of when this was written
 * and Anthropic's own billing is the source of truth, not this file. Treat the
 * printed figure as "roughly this, check the console for the real number" —
 * it exists to catch a run that is behaving very differently from expected,
 * not to reconcile an invoice.
 */
export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export const ZERO_USAGE: UsageTotals = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
};

export function addUsage(a: UsageTotals, b: UsageTotals): UsageTotals {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationInputTokens: a.cacheCreationInputTokens + b.cacheCreationInputTokens,
    cacheReadInputTokens: a.cacheReadInputTokens + b.cacheReadInputTokens,
  };
}

export function usageFrom(response: { usage: Anthropic.Beta.BetaUsage }): UsageTotals {
  const usage = response.usage;
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
  };
}

/** $ per million tokens. Cache multipliers are Anthropic's standard ~1.25x write / ~0.1x read. */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-5": { input: 5, output: 25 },
};
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

export function estimateCostUsd(usage: UsageTotals, model: string): number {
  const rate = PRICING[model];
  if (!rate) return NaN; // Surfaces as "NaN" in a log rather than a silently wrong number.

  const perTokenIn = rate.input / 1_000_000;
  const perTokenOut = rate.output / 1_000_000;

  return (
    usage.inputTokens * perTokenIn +
    usage.outputTokens * perTokenOut +
    usage.cacheCreationInputTokens * perTokenIn * CACHE_WRITE_MULTIPLIER +
    usage.cacheReadInputTokens * perTokenIn * CACHE_READ_MULTIPLIER
  );
}

export function formatUsd(amount: number): string {
  return Number.isNaN(amount) ? "unknown" : `$${amount.toFixed(3)}`;
}

/** A one-line summary for the terminal: "12,481 in / 3,902 out (1,204 cached) — $0.187". */
export function formatUsageLine(usage: UsageTotals, model: string): string {
  const cached =
    usage.cacheReadInputTokens > 0 ? ` (${usage.cacheReadInputTokens.toLocaleString()} cached)` : "";
  return (
    `${usage.inputTokens.toLocaleString()} in / ${usage.outputTokens.toLocaleString()} out${cached}` +
    ` — ${formatUsd(estimateCostUsd(usage, model))}`
  );
}

/** Cost across both models, since research and synthesis are priced differently. */
export function estimateTotalCostUsd(research: UsageTotals, synthesis: UsageTotals): number {
  return estimateCostUsd(research, RESEARCH_MODEL) + estimateCostUsd(synthesis, SYNTHESIS_MODEL);
}
