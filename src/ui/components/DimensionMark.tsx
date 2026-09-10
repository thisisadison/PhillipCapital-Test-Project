import { getQuestion, type DimensionId } from "@/server/domain/riskIntake";
import { seriesColor } from "@/ui/charts/palette";

/**
 * The risk dimension's colour, used the same way the digest uses its category
 * colours: a 3px rail on the left edge of a card, and a small named tag.
 *
 * A slot is bound to a dimension for the life of the product, so the colour on
 * an intake card, on the risk factor it produced, and on the scope area that
 * answers it are all the same colour. That is the whole value — a reader can
 * follow customer risk across three screens without reading a word.
 *
 * The tag always names the dimension in text. Colour is the shortcut, never
 * the only carrier.
 */

export function DimensionRail({ dimension }: { dimension: DimensionId | null }) {
  const question = dimension ? getQuestion(dimension) : null;

  return (
    <span
      aria-hidden="true"
      className="absolute inset-y-0 left-0 w-[3px]"
      style={{
        // An unresolved dimension gets the neutral rule rather than borrowing a
        // dimension's colour, which would say something untrue.
        backgroundColor: question ? seriesColor(question.colorSlot) : "var(--line-strong)",
      }}
    />
  );
}

export function DimensionTag({ dimension }: { dimension: DimensionId | null }) {
  const question = dimension ? getQuestion(dimension) : null;
  if (!question) return null;

  return (
    <span className="meta inline-flex items-center gap-1.5 text-ink-muted">
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: seriesColor(question.colorSlot) }}
      />
      {question.label}
    </span>
  );
}

/** A card that carries a dimension's rail. Keeps the padding-plus-rail pairing in one place. */
export function DimensionCard({
  dimension,
  className = "",
  children,
}: {
  dimension: DimensionId | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-surface p-5 pl-6 shadow-[var(--shadow-card)] sm:p-6 sm:pl-7 ${className}`}
    >
      <DimensionRail dimension={dimension} />
      {children}
    </div>
  );
}
