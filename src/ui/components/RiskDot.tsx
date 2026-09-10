import type { RiskRating } from "@/server/domain/programme";
import { impactColor } from "@/ui/charts/palette";

/**
 * Risk rating reuses the ordinal impact ramp — one hue, light to dark — because
 * a rating is an ordered scale, not a set of unrelated categories.
 *
 * Always paired with its label in text: the dot is a glance cue, never the only
 * carrier of the rating.
 */
const SWATCH: Record<RiskRating, string> = {
  high: impactColor("act-now"),
  medium: impactColor("plan-for"),
  low: impactColor("watch"),
};

export function RiskDot({ rating }: { rating: RiskRating }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: SWATCH[rating] }}
    />
  );
}
