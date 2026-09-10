import {
  RISK_LABELS,
  totalCostUsd,
  totalSteps,
  type AuditProgramme,
} from "@/server/domain/programme";
import { INTAKE_QUESTIONS, labelsFor } from "@/server/domain/riskIntake";
import { formatTimestamp } from "@/shared/dates";
import { formatUsd } from "@/server/service/UsageTracking";
import { TIMEZONE } from "@/server/config";
import { AgentTimeline } from "./AgentTimeline";
import { ScopeApproval } from "./ScopeApproval";
import { RiskDot } from "./RiskDot";

/**
 * A programme, in the order the work happened: what you told it, what each
 * agent made of that, and then either the scope awaiting your approval or the
 * finished testing.
 *
 * Laying it out this way is the design. The intake, the risk factors and the
 * obligations are not appendices — they are the reasoning, and putting them
 * ahead of the programme is what lets an auditor disagree with the conclusion
 * by pointing at the step that produced it.
 */
export function ProgrammeView({ programme }: { programme: AuditProgramme }) {
  const planned = programme.status === "planned";
  const stepCount = totalSteps(programme);

  return (
    <>
      <p className="meta uppercase tracking-[0.16em] text-ink-faint">AML / CFT audit programme</p>
      <h1 className="display mt-3 text-[2.25rem] leading-[1.1] text-ink sm:text-[2.75rem]">
        {programme.title}
      </h1>

      <p className="meta mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <time dateTime={programme.createdAt}>
          {formatTimestamp(programme.createdAt, TIMEZONE)}
        </time>
        <Separator />
        <span>{programme.scopeAreas.length} areas</span>
        <Separator />
        <span>{programme.riskFactors.length} risk factors</span>
        <Separator />
        <span>{programme.obligations.length} obligations</span>
        {planned ? null : (
          <>
            <Separator />
            <span>{stepCount} steps</span>
          </>
        )}
        <Separator />
        <span>{formatUsd(totalCostUsd(programme))}</span>
      </p>

      <p className="mt-6 max-w-[var(--measure)] text-[1.0625rem] leading-[1.7] text-ink">
        {programme.scopeSummary}
      </p>

      <AgentTimeline runs={programme.runs} awaitingApproval={planned} />

      <Intake programme={programme} />
      <RiskFactors programme={programme} />
      <Obligations programme={programme} />

      {planned ? (
        <ScopeApproval
          programmeId={programme.id}
          areas={programme.scopeAreas}
          riskFactors={programme.riskFactors}
          obligations={programme.obligations}
        />
      ) : (
        <Testing programme={programme} />
      )}

      <footer className="mt-16 border-t border-line pt-6">
        {/* Said plainly, on every programme: this is a drafting aid. An audit
            programme is the auditor's professional responsibility, and nothing
            generated here changes that. */}
        <p className="max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          This is a drafting aid, not an audit programme of record. Every step should be reviewed
          and signed off by the responsible auditor before fieldwork, and the cited requirements
          checked against the current text of each instrument.
        </p>
      </footer>
    </>
  );
}

/** What the auditor actually selected, restated so the inputs stay visible beside the output. */
function Intake({ programme }: { programme: AuditProgramme }) {
  return (
    <section className="mt-8 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="meta uppercase tracking-[0.14em] text-ink">What you told it</h2>

      <dl className="mt-4 space-y-3">
        {INTAKE_QUESTIONS.map((question) => {
          const labels = labelsFor(question.id, programme.intake[question.id]);
          if (labels.length === 0) return null;

          return (
            <div key={question.id} className="sm:flex sm:gap-4">
              <dt className="meta w-40 shrink-0 uppercase tracking-[0.08em] text-ink-faint">
                {question.label}
              </dt>
              <dd className="mt-1 text-[0.9375rem] leading-[1.6] text-ink-muted sm:mt-0">
                {labels.join(" · ")}
              </dd>
            </div>
          );
        })}

        {programme.intake.note ? (
          <div className="sm:flex sm:gap-4">
            <dt className="meta w-40 shrink-0 uppercase tracking-[0.08em] text-ink-faint">
              Your note
            </dt>
            <dd className="mt-1 text-[0.9375rem] leading-[1.6] text-ink-muted sm:mt-0">
              {programme.intake.note}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

/** Risk Agent output. `drivenBy` is the whole point: every factor names its cause. */
function RiskFactors({ programme }: { programme: AuditProgramme }) {
  return (
    <section className="mt-12">
      <div className="border-t border-line-strong pt-5">
        <h2 className="display text-[1.5rem] leading-snug text-ink">Assessed risk</h2>
        <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          What this combination of business lines, clients and channels exposes the firm to. Each
          factor names the answers that produced it.
        </p>
      </div>

      <ul className="mt-5 space-y-3">
        {programme.riskFactors.map((factor) => (
          <li
            key={factor.id}
            className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
          >
            <p className="meta flex flex-wrap items-center gap-2 uppercase tracking-[0.12em]">
              <RiskDot rating={factor.severity} />
              <span className="text-ink-muted">{RISK_LABELS[factor.severity]}</span>
            </p>

            <h3 className="mt-1.5 text-[1.0625rem] font-semibold leading-snug text-ink">
              {factor.factor}
            </h3>
            <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
              {factor.rationale}
            </p>

            {factor.drivenBy.length > 0 ? (
              <ul className="mt-3.5 flex flex-wrap gap-1.5 border-t border-line pt-3">
                {factor.drivenBy.map((driver) => (
                  <li
                    key={driver}
                    className="meta rounded border border-line bg-surface-sunken px-1.5 py-0.5 text-ink-muted"
                  >
                    {driver}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** MAS Agent output. Every row links to the page it was read from. */
function Obligations({ programme }: { programme: AuditProgramme }) {
  return (
    <section className="mt-12">
      <div className="border-t border-line-strong pt-5">
        <h2 className="display text-[1.5rem] leading-snug text-ink">Obligations to test against</h2>
        <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          Read from the instruments themselves. Anything that could not be tied to a retrieved
          source was dropped rather than paraphrased — open each one and check it.
        </p>
      </div>

      <ol className="mt-5 divide-y divide-line border-t border-line">
        {programme.obligations.map((obligation) => (
          <li key={obligation.id} className="py-4">
            <p className="text-[0.9375rem] font-semibold leading-snug text-ink">
              {obligation.reference}
            </p>
            <p className="mt-1.5 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
              {obligation.requirement}
            </p>
            <p className="meta mt-2">
              <a
                href={obligation.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-line-strong underline-offset-4 transition-colors duration-200 hover:text-[var(--accent-ink)]"
              >
                {obligation.sourceName}
              </a>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The finished programme. Areas the auditor declined are listed, without steps, as part of the record. */
function Testing({ programme }: { programme: AuditProgramme }) {
  const approved = programme.scopeAreas.filter((area) => area.approved);
  const declined = programme.scopeAreas.filter((area) => !area.approved);

  const riskById = new Map(programme.riskFactors.map((factor) => [factor.id, factor]));
  const obligationById = new Map(programme.obligations.map((item) => [item.id, item]));

  return (
    <section className="mt-12">
      <div className="border-t border-line-strong pt-5">
        <h2 className="display text-[1.5rem] leading-snug text-ink">Testing programme</h2>
        <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          Drafted for the {approved.length} area{approved.length === 1 ? "" : "s"} you approved.
        </p>
      </div>

      <div className="mt-8 space-y-12">
        {approved.map((area, index) => (
          <article key={area.id} aria-labelledby={`area-${area.id}`}>
            <p className="meta flex flex-wrap items-center gap-2 uppercase tracking-[0.12em]">
              <span className="text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
              <RiskDot rating={area.riskRating} />
              <span className="text-ink-muted">{RISK_LABELS[area.riskRating]} priority</span>
            </p>

            <h3
              id={`area-${area.id}`}
              className="display mt-2 text-[1.375rem] leading-snug text-ink"
            >
              {area.title}
            </h3>
            <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
              {area.rationale}
            </p>

            {/* The criteria repeat here rather than only in the section above:
                an auditor performing this step should not have to scroll back
                to find what they are testing against. */}
            <ul className="meta mt-3 space-y-1">
              {area.testsObligations.map((id) => {
                const obligation = obligationById.get(id);
                return obligation ? (
                  <li key={id} className="text-ink-faint">
                    Tests {obligation.reference}
                  </li>
                ) : null;
              })}
              {area.addressesRiskFactors.map((id) => {
                const factor = riskById.get(id);
                return factor ? (
                  <li key={id} className="text-ink-faint">
                    Answers {factor.factor}
                  </li>
                ) : null;
              })}
            </ul>

            <ol className="mt-5 space-y-3">
              {area.steps.map((step, stepIndex) => (
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
          </article>
        ))}
      </div>

      {declined.length > 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-line p-5">
          <h3 className="meta uppercase tracking-[0.14em] text-ink">Proposed and declined</h3>
          <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
            Kept as part of the record: these areas were proposed and you took them out of scope, so
            no testing was drafted for them.
          </p>
          <ul className="mt-3 space-y-1.5">
            {declined.map((area) => (
              <li key={area.id} className="text-[0.9375rem] leading-[1.5] text-ink-faint">
                {area.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Separator() {
  return (
    <span aria-hidden="true" className="text-line-strong">
      ·
    </span>
  );
}
