/**
 * Shown while the current edition is read from storage. Mirrors the real
 * page's rhythm so the transition is a fill-in, not a jump.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8" aria-busy="true">
      <div className="py-6">
        <Bar className="h-3 w-56" />
      </div>

      <div className="pt-8 sm:pt-12">
        <Bar className="h-3 w-64" />
        <Bar className="mt-5 h-11 w-[min(100%,26rem)]" />
        <Bar className="mt-7 h-5 w-full max-w-[36rem]" />
        <Bar className="mt-2.5 h-5 w-4/5 max-w-[30rem]" />

        <div className="mt-14 space-y-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-xl border border-line bg-surface p-6">
              <Bar className="h-5 w-3/4" />
              <Bar className="mt-4 h-3.5 w-full" />
              <Bar className="mt-2 h-3.5 w-11/12" />
              <Bar className="mt-5 h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading the digest…</span>
    </div>
  );
}

function Bar({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded bg-line motion-safe:animate-pulse ${className}`}
    />
  );
}
