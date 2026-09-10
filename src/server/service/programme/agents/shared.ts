import { createHash } from "node:crypto";
import {
  FALLBACK_BETA,
  supportsNewerRequestFeatures,
} from "@/server/service/AnthropicClient";
import { RISK_RATINGS, type RiskRating } from "@/server/domain/programme";

/**
 * Shared plumbing for the four agents.
 *
 * Each agent is a separate model call with its own prompt, its own job and its
 * own persisted output. What they have in common is the request shape and the
 * text hygiene — kept here so a change to either lands in one place.
 */

/** Request fields that only exist on newer models. See `supportsNewerRequestFeatures`. */
export function tuningFor(model: string, effort: "low" | "medium" = "medium") {
  return supportsNewerRequestFeatures(model)
    ? {
        betas: [FALLBACK_BETA],
        fallbacks: "default" as const,
        thinking: { type: "adaptive" as const },
        output_config: { effort },
      }
    : {};
}

/**
 * The `effort` half of `output_config`, spread alongside a `format` at the call
 * site rather than wrapped in a helper — wrapping widens the format's generic
 * and `parsed_output` silently loses its type.
 */
export function effortFor(model: string, effort: "low" | "medium" = "medium") {
  return supportsNewerRequestFeatures(model) ? { effort } : {};
}

/** Request fields for a structured-output call, minus `output_config`. */
export function betaFieldsFor(model: string) {
  return supportsNewerRequestFeatures(model)
    ? {
        betas: [FALLBACK_BETA],
        fallbacks: "default" as const,
        thinking: { type: "adaptive" as const },
      }
    : {};
}

/** Unknown wording normalises to medium — never inflated to high, never dismissed. */
export function normaliseRisk(raw: string): RiskRating {
  const key = raw.trim().toLowerCase().replace(/[^a-z]/g, "");

  for (const rating of RISK_RATINGS) {
    if (rating === key) return rating;
  }
  if (key.startsWith("high") || key === "critical" || key === "severe") return "high";
  if (key.startsWith("low") || key === "minor") return "low";
  return "medium";
}

export function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function clamp(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export function hashId(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function label(value: string, max = 60): string {
  const collapsed = collapse(value);
  if (!collapsed) return "untitled";
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 1)}…`;
}
