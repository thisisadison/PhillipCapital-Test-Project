import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <SiteHeader />
      <main className="pt-16">
        <p className="meta uppercase tracking-[0.16em] text-ink-faint">Not found</p>
        <h1 className="display mt-3 text-[2.25rem] leading-[1.1] text-ink">
          There is no edition here
        </h1>
        <p className="mt-4 max-w-[var(--measure)] text-[0.9375rem] leading-relaxed text-ink-muted">
          The digest you asked for has not been published, or the date in the address is not one we
          have on file.
        </p>
        <Link
          href="/"
          className="meta mt-8 inline-block uppercase tracking-[0.1em] text-ink underline underline-offset-4"
        >
          Go to the current digest
        </Link>
      </main>
    </div>
  );
}
