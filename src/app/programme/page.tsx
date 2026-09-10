import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/ui/components/SiteHeader";
import { ProgrammeForm } from "@/ui/components/ProgrammeForm";
import { formatTimestamp } from "@/shared/dates";
import { TIMEZONE } from "@/server/config";
import { getProgrammeRepository } from "@/server/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Audit Programme" };

export default async function ProgrammeIndexPage() {
  const programmes = await getProgrammeRepository().listSummaries(12);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <SiteHeader current="/programme" />

      <main className="pt-10 sm:pt-14">
        <p className="meta uppercase tracking-[0.16em] text-ink-faint">AML / CFT</p>
        <h1 className="display mt-3 text-[2.25rem] leading-[1.1] text-ink sm:text-[2.75rem]">
          Audit Programme
        </h1>
        <p className="mt-5 max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          Describe the firm&apos;s risk context and this researches the applicable MAS and FATF
          obligations, then drafts a risk-based programme of audit steps against them — each one
          citing the requirement it tests and naming the evidence to collect.
        </p>

        <div className="mt-8">
          <ProgrammeForm />
        </div>

        <section className="mt-14">
          <h2 className="meta uppercase tracking-[0.14em] text-ink">Generated programmes</h2>

          {programmes.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line px-5 py-8 text-sm text-ink-faint">
              None yet. Generate one above and it will be kept here.
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-line border-t border-line-strong">
              {programmes.map((programme) => (
                <li key={programme.id}>
                  <Link href={`/programme/${programme.id}`} className="group block py-5">
                    <p className="display text-lg text-ink transition-colors duration-200 group-hover:text-[var(--accent-ink)]">
                      {programme.title}
                    </p>
                    <p className="meta mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <time dateTime={programme.generatedAt}>
                        {formatTimestamp(programme.generatedAt, TIMEZONE)}
                      </time>
                      <span aria-hidden="true" className="text-line-strong">·</span>
                      <span>{programme.sectionCount} areas</span>
                      <span aria-hidden="true" className="text-line-strong">·</span>
                      <span>{programme.stepCount} steps</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
