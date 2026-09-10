import { RISK_LABELS, type AuditProgramme } from "@/server/domain/programme";
import { formatTimestamp } from "@/shared/dates";
import { TIMEZONE } from "@/server/config";
import { impactColor } from "@/ui/charts/palette";

/** Risk rating reuses the ordinal ramp — it is an ordered scale, not a set of categories. */
const RISK_SWATCH: Record<string, string> = {
  high: impactColor("act-now"),
  medium: impactColor("plan-for"),
  low: impactColor("watch"),
};

/**
 * A generated programme, laid out for someone about to execute it: scope first,
 * then each area with its requirement, then numbered steps with the evidence to
 * collect against each.
 */
export function ProgrammeView({ programme }: { programme: AuditProgramme }) {
  const stepCount = programme.sections.reduce((total, section) => total + section.steps.length, 0);

  return (
    <>
      <p className="meta uppercase tracking-[0.16em] text-ink-faint">Audit programme</p>
      <h1 className="display mt-3 text-[2.25rem] leading-[1.1] text-ink sm:text-[2.75rem]">
        {programme.title}
      </h1>

      <p className="meta mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <time dateTime={programme.generatedAt}>
          {formatTimestamp(programme.generatedAt, TIMEZONE)}
        </time>
        <span aria-hidden="true" className="text-line-strong">·</span>
        <span>{programme.sections.length} areas</span>
        <span aria-hidden="true" className="text-line-strong">·</span>
        <span>{stepCount} steps</span>
      </p>

      <div className="mt-8 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="meta uppercase tracking-[0.14em] text-ink">Scope</h2>
        <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          {programme.scopeSummary}
        </p>

        <h3 className="meta mt-5 uppercase tracking-[0.14em] text-ink">Risk context supplied</h3>
        <p className="mt-2 max-w-[var(--measure)] border-l-2 border-line-strong pl-3 text-[0.9375rem] leading-[1.7] text-ink-faint">
          {programme.riskContext}
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {programme.sections.map((section, index) => (
          <section key={section.id} aria-labelledby={`section-${section.id}`}>
            <div className="border-t border-line-strong pt-5">
              <p className="meta flex flex-wrap items-center gap-2 uppercase tracking-[0.12em]">
                <span className="text-ink-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: RISK_SWATCH[section.riskRating] }}
                />
                <span className="text-ink-muted">{RISK_LABELS[section.riskRating]}</span>
              </p>

              <h2
                id={`section-${section.id}`}
                className="display mt-2 text-[1.5rem] leading-snug text-ink"
              >
                {section.title}
              </h2>

              <p className="mt-2.5 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
                {section.rationale}
              </p>

              <p className="meta mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold uppercase tracking-[0.07em] text-ink-muted">
                  {section.requirementReference}
                </span>
                <span aria-hidden="true" className="text-line-strong">·</span>
                <a
                  href={section.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-line-strong underline-offset-4 transition-colors duration-200 hover:text-[var(--accent-ink)]"
                >
                  {section.sourceName}
                </a>
              </p>
            </div>

            <ol className="mt-5 space-y-3">
              {section.steps.map((step, stepIndex) => (
                <li
                  key={step.id}
                  className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
                >
                  <p className="text-[0.9375rem] leading-[1.65] text-ink">
                    <span className="meta mr-2 text-ink-faint">
                      {index + 1}.{stepIndex + 1}
                    </span>
                    {step.procedure}
                  </p>

                  <dl className="meta mt-3.5 space-y-1.5 border-t border-line pt-3">
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 uppercase tracking-[0.08em] text-ink-faint">
                        Evidence
                      </dt>
                      <dd className="text-ink-muted">{step.evidenceRequired}</dd>
                    </div>
                    {step.sampling ? (
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 uppercase tracking-[0.08em] text-ink-faint">
                          Sampling
                        </dt>
                        <dd className="text-ink-muted">{step.sampling}</dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <footer className="mt-16 border-t border-line pt-6">
        {/* Said plainly, on every programme: this is a drafting aid. An audit
            programme is the auditor's professional responsibility, and nothing
            generated here changes that. */}
        <p className="max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          This is a drafting aid, not an audit programme of record. Every step should be reviewed
          and signed off by the responsible auditor before fieldwork, and the cited requirements
          checked against the current text of each instrument.
        </p>

        <dl className="meta mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <Row label="Generated">{formatTimestamp(programme.generatedAt, TIMEZONE)}</Row>
          <Row label="Model">{programme.meta.model}</Row>
          <Row label="Sources read">{programme.meta.sourcesConsulted} publishers</Row>
          {programme.meta.sectionsRejected > 0 ? (
            <Row label="Rejected">
              {programme.meta.sectionsRejected} drafted section
              {programme.meta.sectionsRejected === 1 ? "" : "s"} did not pass checks
            </Row>
          ) : null}
        </dl>
      </footer>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 uppercase tracking-[0.08em] text-ink-faint">{label}</dt>
      <dd className="text-ink-muted">{children}</dd>
    </div>
  );
}
