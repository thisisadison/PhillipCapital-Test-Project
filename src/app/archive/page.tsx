import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/ui/components/SiteHeader";
import { TrendSparkline } from "@/ui/charts/TrendSparkline";
import { ARCHIVE_LIMIT } from "@/server/config";
import { CATEGORIES } from "@/server/domain/category";
import { formatEditionDate } from "@/shared/dates";
import { deriveTrend } from "@/shared/digestStats";
import { getDigestRepository } from "@/server/repository";
import { seriesColor } from "@/ui/charts/palette";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage() {
  const summaries = await getDigestRepository().listSummaries(ARCHIVE_LIMIT);
  const trend = deriveTrend(summaries);
  const totalEntries = summaries.reduce((sum, summary) => sum + summary.entryCount, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <SiteHeader current="/archive" />

      <main className="pt-10 sm:pt-14">
        <p className="meta uppercase tracking-[0.16em] text-ink-faint">Past editions</p>
        <h1 className="display mt-3 text-[2.25rem] leading-[1.1] text-ink sm:text-[2.75rem]">
          Archive
        </h1>

        {summaries.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-line px-5 py-8 text-sm text-ink-faint">
            No editions have been published yet. The first one will appear here once the scheduled
            run has completed.
          </p>
        ) : (
          <>
            <div className="mt-8 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <h2 className="meta uppercase tracking-[0.14em] text-ink">Entries per edition</h2>
              <p className="meta mt-1 text-ink-faint">
                {summaries.length} edition{summaries.length === 1 ? "" : "s"} · {totalEntries} items
                in total
              </p>
              {/* Capped rather than full-bleed: the SVG has a fixed aspect
                  ratio, so stretching it across the card would letterbox it
                  into a thin line stranded in white space. */}
              <div className="mt-4 max-w-sm">
                {trend.length > 0 ? (
                  <TrendSparkline points={trend} />
                ) : (
                  <p className="meta text-ink-faint">
                    A trend appears once there are at least two editions.
                  </p>
                )}
              </div>
            </div>

            <ol className="mt-10 divide-y divide-line border-t border-line-strong">
              {summaries.map((summary, index) => (
                <li
                  key={summary.date}
                  className="rise"
                  style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                >
                  <Link href={`/archive/${summary.date}`} className="group block py-6">
                    <p className="meta flex flex-wrap items-center gap-2 uppercase tracking-[0.1em]">
                      <time dateTime={summary.date} className="text-ink-muted">
                        {formatEditionDate(summary.date)}
                      </time>
                      <span aria-hidden="true" className="text-line-strong">
                        ·
                      </span>
                      <span>
                        {summary.entryCount} {summary.entryCount === 1 ? "entry" : "entries"}
                      </span>
                    </p>

                    <p className="mt-2 max-w-[38rem] text-[0.9375rem] leading-relaxed text-ink transition-colors duration-200 group-hover:text-[var(--accent-ink)]">
                      {summary.summary}
                    </p>

                    {/* Which sections that edition actually carried — a shape
                        the reader can compare across weeks at a glance. */}
                    <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                      {CATEGORIES.filter(
                        (category) => (summary.countsByCategory[category.id] ?? 0) > 0,
                      ).map((category) => (
                        <li key={category.id} className="meta flex items-center gap-1.5 text-ink-faint">
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: seriesColor(category.colorSlot) }}
                          />
                          {category.shortLabel}
                          <span>{summary.countsByCategory[category.id]}</span>
                        </li>
                      ))}
                    </ul>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
    </div>
  );
}
