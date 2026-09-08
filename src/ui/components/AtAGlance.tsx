import type { DigestStats } from "@/shared/digestStats";
import { impactColor, seriesColor } from "@/ui/charts/palette";
import { StackedShareBar } from "@/ui/charts/StackedShareBar";

/**
 * The overview band under the lede.
 *
 * Answers the three questions a reader has before they start reading: how much
 * is there, how much of it needs action, and where did it come from. The
 * source-mix bar is the one that earns its place most — it is the standing
 * answer to "is this a digest of regulators, or of vendor blogs?".
 */
export function AtAGlance({ stats }: { stats: DigestStats }) {
  return (
    <section
      aria-labelledby="at-a-glance"
      className="rise rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <h2 id="at-a-glance" className="meta uppercase tracking-[0.14em] text-ink">
        This week at a glance
      </h2>

      <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-8">
        <dl className="flex gap-6 sm:gap-8">
          <Figure value={stats.total} label={stats.total === 1 ? "item" : "items"} />
          <Figure
            value={stats.actNow}
            label="need action"
            swatch={stats.actNow > 0 ? impactColor("act-now") : undefined}
          />
          <Figure value={stats.primarySharePercent} suffix="%" label="from primary sources" />
        </dl>

        <div className="min-w-0">
          <StackedShareBar
            tableCaption="Entries by section"
            caption={`${stats.distinctPublishers} publishers across ${
              stats.byCategory.filter((datum) => datum.count > 0).length
            } sections`}
            segments={stats.byCategory.map((datum) => ({
              key: datum.id,
              label: datum.shortLabel,
              count: datum.count,
              color: seriesColor(datum.colorSlot),
            }))}
          />
        </div>
      </div>
    </section>
  );
}

/**
 * A headline number. Set in the display face at a size that reads as a figure
 * rather than as body copy — this is the one place the page raises its voice.
 */
function Figure({
  value,
  label,
  suffix,
  swatch,
}: {
  value: number;
  label: string;
  suffix?: string;
  /** A colour cue set *beside* the label — never applied to the text itself. */
  swatch?: string;
}) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="display text-[2rem] leading-none text-ink">
        {value}
        {suffix ? <span className="text-[1.25rem]">{suffix}</span> : null}
      </dd>
      <p aria-hidden="true" className="meta mt-1.5 flex max-w-[7rem] items-center gap-1.5 leading-tight text-ink-faint">
        {swatch ? (
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: swatch }}
          />
        ) : null}
        {label}
      </p>
    </div>
  );
}
