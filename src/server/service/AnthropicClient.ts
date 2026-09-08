import Anthropic from "@anthropic-ai/sdk";

/** The model behind both pipeline stages. Recorded on every edition. */
export const DIGEST_MODEL = "claude-opus-5";

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
