import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { ARCHIVE_LIMIT } from "@/lib/config";
import { formatEditionDate } from "@/lib/digest/dates";
import { getDigestStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage() {
  const summaries = await getDigestStore().listSummaries(ARCHIVE_LIMIT);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <SiteHeader showArchiveLink={false} />

      <main className="pt-8 sm:pt-12">
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
          <ol className="mt-10 divide-y divide-line border-t border-line-strong">
            {summaries.map((summary, index) => (
              <li key={summary.date} className="rise" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                <Link
                  href={`/archive/${summary.date}`}
                  className="group block py-6 transition-opacity duration-200 hover:opacity-100"
                >
                  <p className="meta flex items-center gap-2 uppercase tracking-[0.1em]">
                    <time dateTime={summary.date} className="text-ink-muted">
                      {formatEditionDate(summary.date)}
                    </time>
                    <span aria-hidden="true" className="text-line-strong">·</span>
                    <span>
                      {summary.entryCount} {summary.entryCount === 1 ? "entry" : "entries"}
                    </span>
                  </p>
                  <p className="mt-2 max-w-[38rem] text-[0.9375rem] leading-relaxed text-ink transition-colors duration-200 group-hover:text-[var(--accent-ink)]">
                    {summary.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
