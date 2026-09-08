"use client";

import { useEffect } from "react";

/**
 * The last line of defence — a storage failure, a malformed edition on disk.
 * It says what is wrong rather than showing a blank page, and never implies
 * the digest is up to date.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] Failed to render the digest.", error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-24 sm:px-8">
      <main>
        <p className="meta uppercase tracking-[0.16em] text-[var(--danger-ink)]">Something failed</p>
        <h1 className="display mt-3 text-[2.25rem] leading-[1.1] text-ink">
          The digest could not be loaded
        </h1>
        <p className="mt-4 max-w-[var(--measure)] text-[0.9375rem] leading-relaxed text-ink-muted">
          This is a fault on our side, not an empty week. Nothing on screen should be taken as the
          current edition until this page loads properly.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
        >
          Try again
        </button>
      </main>
    </div>
  );
}
