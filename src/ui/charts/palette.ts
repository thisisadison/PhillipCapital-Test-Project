/**
 * Chart colour lookups.
 *
 * Charts name a role and get a CSS variable back, so the light and dark values
 * live in one place (`globals.css`) and the two themes cannot drift.
 */
import type { ImpactLevel } from "@/server/domain/digest";

/** Categorical slot, 1-indexed, matching `CategoryDefinition.colorSlot`. */
export function seriesColor(slot: number): string {
  return `var(--series-${Math.min(Math.max(slot, 1), 5)})`;
}

/** Impact is ordered, so it uses a single-hue ordinal ramp, not categorical hues. */
export function impactColor(level: ImpactLevel): string {
  const byLevel: Record<ImpactLevel, string> = {
    "act-now": "var(--impact-act)",
    "plan-for": "var(--impact-plan)",
    watch: "var(--impact-watch)",
  };
  return byLevel[level];
}
