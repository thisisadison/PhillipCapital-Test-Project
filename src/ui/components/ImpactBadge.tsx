import { IMPACT_LABELS, type ImpactLevel } from "@/server/domain/digest";
import { impactColor } from "@/ui/charts/palette";

/**
 * How urgent an item is.
 *
 * The swatch carries the ordinal position, but the label always accompanies it —
 * impact is never communicated by colour alone, which is both the accessibility
 * rule and the honest one when a reader is skimming.
 */
export function ImpactBadge({ level }: { level: ImpactLevel }) {
  return (
    <span className="meta inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-ink-muted">
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: impactColor(level) }}
      />
      {IMPACT_LABELS[level]}
    </span>
  );
}
