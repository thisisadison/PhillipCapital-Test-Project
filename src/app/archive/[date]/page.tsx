import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/ui/components/SiteHeader";
import { DigestView } from "@/ui/components/DigestView";
import { formatEditionDate } from "@/shared/dates";
import { getDigestRepository } from "@/server/repository";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { date } = await params;
  return { title: `Edition of ${date}` };
}

export default async function ArchivedDigestPage({ params }: Params) {
  const { date } = await params;
  const digest = await getDigestRepository().findByDate(date);

  if (!digest) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <SiteHeader current="/archive" />

      <main className="pt-10 sm:pt-14">
        <nav className="mb-8">
          <Link
            href="/archive"
            className="meta uppercase tracking-[0.1em] text-ink-faint underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
          >
            ← All editions
          </Link>
        </nav>

        {/* An archived edition is old by definition, so it carries a plain
            statement of that rather than the current page's freshness notice. */}
        <DigestView
          digest={digest}
          notice={{
            tone: "info",
            title: "Archived edition",
            detail: `This is the edition of ${formatEditionDate(digest.date)}. It is kept as it was published and is not updated.`,
          }}
          showFooterActions={false}
        />
      </main>
    </div>
  );
}
