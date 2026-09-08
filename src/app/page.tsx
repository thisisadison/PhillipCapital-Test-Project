import { SiteHeader } from "@/ui/components/SiteHeader";
import { DigestView } from "@/ui/components/DigestView";
import { EmptyState } from "@/ui/components/EmptyState";
import { deriveStatus } from "@/shared/status";
import { getDigestRepository } from "@/server/repository";

/**
 * The digest is read from storage at request time, never baked in at build
 * time — a statically rendered page would show whatever edition happened to
 * exist when the container was built.
 */
export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const repository = getDigestRepository();
  const [digest, lastRun] = await Promise.all([
    repository.findLatest(),
    repository.findLastRun(),
  ]);
  const status = deriveStatus(digest, lastRun);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <SiteHeader current="/" />
      <main className="pt-10 sm:pt-14">
        {digest ? (
          <DigestView digest={digest} notice={status.notice} />
        ) : (
          <EmptyState notice={status.notice} />
        )}
      </main>
    </div>
  );
}
