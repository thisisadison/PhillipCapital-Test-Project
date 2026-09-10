import { getDimension, type AuditDomain } from "@/server/domain/auditDomain";
import { seriesColor } from "@/ui/charts/palette";

/**
 * A risk dimension's colour, used the same way the digest uses its category
 * colours: a 3px rail on the left edge of a card, and a small named tag.
 *
 * A slot is bound to a dimension for the life of the product, so the colour on
 * an intake card, on the risk factor it produced, and on the scope area that
 * answers it are all the same colour. That is the whole value — a reader can
 * follow one dimension across three screens without reading a word.
 *
 * The control-weakness dimension has no slot and gets the neutral rule. That is
 * deliberate: it is the firm's own view of its control state rather than an
 * inherent risk dimension, and the visual difference says so.
 *
 * The tag always names the dimension in text. Colour is the shortcut, never the
 * only carrier.
 */

/** The rail colour for a dimension, or the neutral rule when it has no slot. */
function railColor(domain: AuditDomain, dimensionId: string | null): string {
  const dimension = dimensionId ? getDimension(domain, dimensionId) : null;
  return dimension?.colorSlot ? seriesColor(dimension.colorSlot) : "var(--line-strong)";
}

export function DimensionRail({
  domain,
  dimension,
}: {
  domain: AuditDomain;
  dimension: string | null;
}) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-y-0 left-0 w-[3px]"
      style={{ backgroundColor: railColor(domain, dimension) }}
    />
  );
}

export function DimensionTag({
  domain,
  dimension,
}: {
  domain: AuditDomain;
  dimension: string | null;
}) {
  const entry = dimension ? getDimension(domain, dimension) : null;
  if (!entry) return null;

  return (
    <span className="meta inline-flex items-center gap-1.5 text-ink-muted">
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: railColor(domain, dimension) }}
      />
      {entry.label}
    </span>
  );
}

/** A card that carries a dimension's rail. Keeps the padding-plus-rail pairing in one place. */
export function DimensionCard({
  domain,
  dimension,
  className = "",
  children,
}: {
  domain: AuditDomain;
  dimension: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-surface p-5 pl-6 shadow-[var(--shadow-card)] sm:p-6 sm:pl-7 ${className}`}
    >
      <DimensionRail domain={domain} dimension={dimension} />
      {children}
    </div>
  );
}
