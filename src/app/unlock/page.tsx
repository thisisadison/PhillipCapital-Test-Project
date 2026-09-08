import type { Metadata } from "next";
import { UnlockForm } from "./UnlockForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Access" };

/**
 * The access gate. One shared code for the team — this is public market
 * information, and anything heavier would be surface area for no benefit.
 */
export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <main className="rise">
        <p className="meta uppercase tracking-[0.16em] text-ink-faint">Internal Audit</p>

        <h1 className="display mt-3 text-[2rem] leading-[1.1] text-ink">
          Market &amp; Tech Trends Digest
        </h1>

        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
          A weekly briefing on audit automation, AI in internal audit, and the regulatory
          developments behind them. Enter the code shared with the team.
        </p>

        <UnlockForm next={next} />
      </main>
    </div>
  );
}
