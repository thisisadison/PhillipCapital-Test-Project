import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/ui/components/SiteHeader";
import { ProgrammeView } from "@/ui/components/ProgrammeView";
import { getProgrammeRepository } from "@/server/repository";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const programme = await getProgrammeRepository().findById(id);
  return { title: programme?.title ?? "Audit Programme" };
}

export default async function ProgrammePage({ params }: Params) {
  const { id } = await params;
  const programme = await getProgrammeRepository().findById(id);

  if (!programme) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <SiteHeader current="/programme" />

      <main className="pt-10 sm:pt-14">
        <nav className="mb-8">
          <Link
            href="/programme"
            className="meta uppercase tracking-[0.1em] text-ink-faint underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
          >
            ← All programmes
          </Link>
        </nav>

        <ProgrammeView programme={programme} />
      </main>
    </div>
  );
}
