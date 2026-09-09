import Anthropic from "@anthropic-ai/sdk";

/**
 * Research is mostly mechanical — search, extract, summarise into structured
 * notes — so it runs on Sonnet 5. Synthesis is the actual editorial writing a
 * reader sees, so it stays on Opus 5, which is the more expensive model.
 * Splitting the two is most of the cost difference between a run that costs a
 * few dollars and one that costs a few cents.
 */
export const RESEARCH_MODEL = "claude-sonnet-5";
export const SYNTHESIS_MODEL = "claude-opus-5";

/** How the two-model split is described wherever one string is expected (the stored edition, logs). */
export const MODEL_DESCRIPTION = `${RESEARCH_MODEL} (research) + ${SYNTHESIS_MODEL} (writing)`;

/**
 * Server-side refusal fallback: if a policy classifier declines a request, the
 * API re-runs it on a fallback model inside the same call rather than failing
 * the weekly run.
 */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let cached: Anthropic | undefined;

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set — the digest pipeline cannot run.");
    this.name = "MissingApiKeyError";
  }
}

/**
 * Server-only. The key is read from the environment and never crosses into a
 * client bundle: every caller is a route handler or a CLI script.
 */
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new MissingApiKeyError();

  if (!cached) {
    cached = new Anthropic({
      // The pipeline runs unattended on a schedule; give it room to retry.
      maxRetries: 3,
      timeout: 10 * 60 * 1000,
    });
  }
  return cached;
}
