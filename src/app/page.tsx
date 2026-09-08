import { SiteHeader } from "@/components/SiteHeader";
import { DigestView } from "@/components/DigestView";
import { EmptyState } from "@/components/EmptyState";
import { deriveStatus } from "@/lib/digest/status";
import { getDigestStore } from "@/lib/store";

/**
 * The digest is read from storage at request time, never baked in at build
 * time — a statically rendered page would show whatever edition happened to
 * exist when the container was built.
 */
export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const store = getDigestStore();
  const [digest, lastRun] = await Promise.all([store.getLatest(), store.getLastRun()]);
  const status = deriveStatus(digest, lastRun);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <SiteHeader />
      <main className="pt-8 sm:pt-12">
        {digest ? (
          <DigestView digest={digest} notice={status.notice} />
        ) : (
          <EmptyState notice={status.notice} />
        )}
      </main>
    </div>
  );
}
