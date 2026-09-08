import Anthropic from "@anthropic-ai/sdk";

/**
 * The model behind both pipeline stages. Recorded on every digest so an
 * edition can always be traced back to what produced it.
 */
export const DIGEST_MODEL = "claude-opus-5";

/**
 * Server-side refusal fallback. If a policy classifier declines a request, the
 * API re-runs it on a fallback model inside the same call instead of failing
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
 * client bundle: every caller of this module is a route handler or a script.
 */
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new MissingApiKeyError();
  }
  if (!cached) {
    cached = new Anthropic({
      // The pipeline runs unattended on a schedule; give it room to retry.
      maxRetries: 3,
      timeout: 10 * 60 * 1000,
    });
  }
  return cached;
}
