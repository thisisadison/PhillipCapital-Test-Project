import { APPROVAL_GATE, PIPELINE_STAGES } from "@/server/domain/pipeline";

/**
 * What will happen, before you start.
 *
 * A list rather than a paragraph. Four agents and a decision is a sequence, and
 * a sequence written as prose makes the reader reconstruct the order from the
 * grammar — which is exactly the work the page should be doing for them.
 *
 * The approval gate gets its own row, unnumbered and marked as yours. Left out
 * of the list it reads as a footnote to the agents; in the list it reads as the
 * step it is.
 */
export function PipelineOverview() {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="meta uppercase tracking-[0.14em] text-ink">How it works</h2>

      <ol className="mt-4 space-y-3.5">
        {PIPELINE_STAGES.map((stage, index) => (
          <Row
            key={stage.id}
            marker={String(index + 1)}
            name={stage.name}
            objective={stage.objective}
            note={stage.note}
            aside={stage.parallel ? "runs at the same time as the Risk Agent" : undefined}
            // The gate is rendered before the stage that waits on it, so the
            // order on the page is the order things actually happen in.
            before={
              stage.afterApproval ? (
                <Row
                  marker="✓"
                  name={APPROVAL_GATE.name}
                  objective={APPROVAL_GATE.objective}
                  note={APPROVAL_GATE.note}
                  highlight
                />
              ) : undefined
            }
          />
        ))}
      </ol>
    </section>
  );
}

function Row({
  marker,
  name,
  objective,
  note,
  aside,
  highlight = false,
  before,
}: {
  marker: string;
  name: string;
  objective: string;
  note: string;
  aside?: string;
  highlight?: boolean;
  before?: React.ReactNode;
}) {
  return (
    <>
      {before}
      <li className="flex gap-3">
        <span
          aria-hidden="true"
          className={`meta mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            highlight
              ? "bg-[var(--accent)] text-canvas"
              : "border border-line-strong text-ink-faint"
          }`}
        >
          {marker}
        </span>

        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 text-[0.9375rem] leading-snug">
            <span className={`font-semibold ${highlight ? "text-[var(--accent-ink)]" : "text-ink"}`}>
              {name}
            </span>
            <span className="text-ink-muted">{objective}</span>
            {aside ? <span className="meta text-ink-faint">{aside}</span> : null}
          </p>
          <p className="mt-0.5 max-w-[var(--measure)] text-sm leading-relaxed text-ink-faint">
            {note}
          </p>
        </div>
      </li>
    </>
  );
}
