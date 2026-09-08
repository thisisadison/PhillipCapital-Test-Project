import { formatShortDate } from "@/shared/dates";
import { SOURCE_TYPE_LABELS, type DigestEntry } from "@/server/domain/digest";
import { getCategory } from "@/server/domain/category";
import { seriesColor } from "@/ui/charts/palette";
import { ImpactBadge } from "./ImpactBadge";
import { PublisherMark } from "./PublisherMark";

/**
 * One item.
 *
 * Carries four things beyond the headline: what it says, what audit should do,
 * how urgent it is, and which areas it lands on. The action line is the part a
 * reader can act on without opening the source, so it gets its own rule and
 * label rather than being buried in the prose.
 */
export function EntryCard({ entry, index }: { entry: DigestEntry; index: number }) {
  const category = getCategory(entry.category);

  return (
    <li className="rise" style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}>
      <article className="group relative overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-card)] transition-[border-color,transform] duration-200 hover:border-line-strong hover:-translate-y-px">
        {/* A hairline in the category's own colour: the one place the section's
            identity appears on the card, without adding chrome. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: seriesColor(category.colorSlot) }}
        />

        <div className="p-5 pl-6 sm:p-6 sm:pl-7">
          <div className="flex items-start justify-between gap-4">
            <h3 className="display text-[1.3125rem] leading-snug text-ink sm:text-[1.4375rem]">
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="after:absolute after:inset-0 after:content-[''] hover:underline hover:decoration-line-strong hover:underline-offset-4"
              >
                {entry.headline}
              </a>
            </h3>
            <ImpactBadge level={entry.impact} />
          </div>

          <p className="mt-2.5 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
            {entry.synthesis}
          </p>

          <p className="mt-4 border-l-2 border-line-strong pl-3 text-[0.9375rem] leading-[1.6] text-ink">
            <span className="meta mr-2 uppercase tracking-[0.08em] text-ink-faint">Do</span>
            {entry.actionRequired}
          </p>

          {entry.affects.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {entry.affects.map((area) => (
                <li
                  key={area}
                  className="meta rounded border border-line bg-surface-sunken px-1.5 py-0.5 text-ink-muted"
                >
                  {area}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="meta mt-5 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-line pt-3.5">
            <PublisherMark name={entry.sourceName} url={entry.sourceUrl} />
            <span className="font-semibold uppercase tracking-[0.07em] text-ink-muted">
              {entry.sourceName}
            </span>
            <Separator />
            <span>{SOURCE_TYPE_LABELS[entry.sourceType]}</span>
            {entry.publishedAt ? (
              <>
                <Separator />
                <time dateTime={entry.publishedAt}>{formatShortDate(entry.publishedAt)}</time>
              </>
            ) : null}
            <span
              aria-hidden="true"
              className="ml-auto text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
            >
              Read →
            </span>
          </div>
        </div>
      </article>
    </li>
  );
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-line-strong">
      ·
    </span>
  );
}
