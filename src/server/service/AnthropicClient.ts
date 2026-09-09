import Anthropic from "@anthropic-ai/sdk";

/**
 * The two knobs that decide what a run costs: which model runs each stage, and
 * how hard it thinks (set alongside each call, in ResearchService.ts and
 * SynthesisService.ts — search for `output_config`).
 *
 * Kept as two separate constants, even though they currently match, so either
 * stage can be bumped independently later — e.g. moving synthesis back to a
 * pricier model without touching research — without restructuring anything.
 */
export const RESEARCH_MODEL = "claude-sonnet-5";
export const SYNTHESIS_MODEL = "claude-sonnet-5";

/** How the model choice is described wherever one string is expected (the stored edition, logs). */
export const MODEL_DESCRIPTION =
  RESEARCH_MODEL === SYNTHESIS_MODEL
    ? RESEARCH_MODEL
    : `${RESEARCH_MODEL} (research) + ${SYNTHESIS_MODEL} (writing)`;

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
