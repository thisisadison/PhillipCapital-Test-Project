import { formatShortDate } from "@/lib/digest/dates";
import { hostnameOf } from "@/lib/digest/sources";
import type { DigestEntry } from "@/lib/digest/schema";

/**
 * One item. The whole card is the link — an auditor scanning the page should
 * be able to hit any part of an entry to reach the source.
 */
export function EntryCard({ entry, index }: { entry: DigestEntry; index: number }) {
  const host = hostnameOf(entry.sourceUrl);

  return (
    <li
      className="rise"
      // A short stagger down the list, capped so later entries are not left waiting.
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
    >
      <a
        href={entry.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-[border-color,transform] duration-200 hover:border-line-strong hover:-translate-y-px sm:p-6"
      >
        <h3 className="display text-[1.3125rem] leading-snug text-ink sm:text-[1.4375rem]">
          {entry.headline}
        </h3>

        <p className="mt-2.5 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
          {entry.synthesis}
        </p>

        <p className="meta mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold uppercase tracking-[0.07em] text-ink-muted">
            {entry.sourceName}
          </span>
          {entry.publishedAt ? (
            <>
              <Separator />
              <time dateTime={entry.publishedAt}>{formatShortDate(entry.publishedAt)}</time>
            </>
          ) : null}
          {host && host.toLowerCase() !== entry.sourceName.toLowerCase() ? (
            <>
              <Separator />
              <span className="truncate">{host}</span>
            </>
          ) : null}
          <span
            aria-hidden="true"
            className="ml-auto text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
          >
            Read →
          </span>
        </p>
      </a>
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
