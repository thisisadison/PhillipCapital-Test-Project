import { OBLIGATION_THEMES } from "@/server/domain/masFramework";

/**
 * Which MAS obligation themes this programme actually reached.
 *
 * Shows the misses as prominently as the hits. A tool that displayed only what
 * it found would let an auditor assume the silence meant "nothing there",
 * when it usually means the search did not get that far — and an AML audit
 * that quietly omits sanctions screening is the kind of gap that ends up in an
 * inspection finding.
 *
 * Coverage is not a score, so it is deliberately not rendered as a percentage
 * or a progress bar: not every theme applies to every firm, and a firm that
 * genuinely has no PEP exposure should not read as 92% compliant.
 */
export function ThemeCoverage({ covered }: { covered: Set<string> }) {
  const reached = OBLIGATION_THEMES.filter((theme) => covered.has(theme.id));
  const missed = OBLIGATION_THEMES.filter((theme) => !covered.has(theme.id));

  return (
    <section className="mt-8 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="meta uppercase tracking-[0.14em] text-ink">Obligation coverage</h2>
        <p className="meta text-ink-faint">
          {reached.length} of {OBLIGATION_THEMES.length} themes reached
        </p>
      </div>

      <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
        The themes an AML/CFT audit is normally expected to cover, and whether this run found a
        citable obligation for each. A theme not reached is a gap to close by hand — not a theme
        that does not apply.
      </p>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {reached.map((theme) => (
          <li
            key={theme.id}
            title={theme.scope}
            className="meta rounded border border-line bg-surface-sunken px-1.5 py-0.5 text-ink-muted"
          >
            <span aria-hidden="true" className="mr-1 text-[var(--accent-ink)]">
              ✓
            </span>
            {theme.label}
          </li>
        ))}
        {missed.map((theme) => (
          <li
            key={theme.id}
            title={theme.scope}
            // Dashed and warm-toned, so a gap reads as a gap at a glance — and
            // still says "not reached" in text for anyone who cannot see that.
            className="meta rounded border border-dashed border-[var(--warn-line)] bg-[var(--warn-bg)] px-1.5 py-0.5 text-[var(--warn-ink)]"
          >
            <span className="sr-only">Not reached: </span>
            <span aria-hidden="true" className="mr-1">
              —
            </span>
            {theme.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
