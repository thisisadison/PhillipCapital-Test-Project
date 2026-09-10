import {
  RISK_LABELS,
  coveredThemes,
  dominantDimension,
  totalCostUsd,
  totalSteps,
  type AuditProgramme,
} from "@/server/domain/programme";
import { labelsFor, selectionsFor } from "@/server/domain/riskIntake";
import { getAuditDomain, getTheme, type AuditDomain } from "@/server/domain/auditDomain";
import "@/server/domain/domains";
import { formatTimestamp } from "@/shared/dates";
import { formatUsd } from "@/server/service/UsageTracking";
import { TIMEZONE } from "@/server/config";
import { seriesColor } from "@/ui/charts/palette";
import { AgentTimeline } from "./AgentTimeline";
import { ScopeApproval } from "./ScopeApproval";
import { ThemeCoverage } from "./ThemeCoverage";
import { DimensionCard, DimensionTag } from "./DimensionMark";
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
 *
 * Colour is a key throughout: each of MAS's risk dimensions owns a slot from
 * the validated palette, and that colour follows the dimension from the intake
 * card onto the risk factors it produced and the scope areas that answer them.
 */
export function ProgrammeView({ programme }: { programme: AuditProgramme }) {
  const planned = programme.status === "planned";
  const stepCount = totalSteps(programme);
  const domain = getAuditDomain(programme.domain);

  return (
    <>
      <p className="meta uppercase tracking-[0.16em] text-ink-faint">{domain.label} audit</p>
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

      <Intake programme={programme} domain={domain} />
      <RiskFactors programme={programme} domain={domain} />
      <ThemeCoverage domain={domain} covered={coveredThemes(programme)} />
      <Obligations programme={programme} domain={domain} />

      {planned ? (
        <ScopeApproval
          programmeId={programme.id}
          domainId={programme.domain}
          areas={programme.scopeAreas}
          riskFactors={programme.riskFactors}
          obligations={programme.obligations}
        />
      ) : (
        <Testing programme={programme} domain={domain} />
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

/**
 * What the auditor selected, restated as MAS's own risk assessment.
 *
 * One card per dimension in the same colours as the intake form, so the
 * assessment reads back the way it was entered.
 */
function Intake({ programme, domain }: { programme: AuditProgramme; domain: AuditDomain }) {
  return (
    <section className="mt-12">
      <div className="border-t border-line-strong pt-5">
        <h2 className="display text-[1.5rem] leading-snug text-ink">The risk assessment</h2>
        <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          {domain.frameworkNote}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {domain.dimensions.map((dimension) => {
          const labels = labelsFor(
            domain,
            dimension.id,
            selectionsFor(programme.intake, dimension.id),
          );
          if (labels.length === 0) return null;

          return (
            <DimensionCard
              key={dimension.id}
              domain={domain}
              dimension={dimension.id}
              className="!p-4 !pl-5"
            >
              <h3 className="meta flex items-center gap-1.5 uppercase tracking-[0.1em] text-ink">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: dimension.colorSlot
                      ? seriesColor(dimension.colorSlot)
                      : "var(--line-strong)",
                  }}
                />
                {dimension.label}
              </h3>
              <ul className="mt-2 space-y-1">
                {labels.map((label) => (
                  <li key={label} className="text-[0.9375rem] leading-[1.5] text-ink-muted">
                    {label}
                  </li>
                ))}
              </ul>
            </DimensionCard>
          );
        })}
      </div>

      {programme.intake.note ? (
        <p className="mt-3 max-w-[var(--measure)] border-l-2 border-line-strong pl-3 text-[0.9375rem] leading-[1.65] text-ink-muted">
          <span className="meta mr-2 uppercase tracking-[0.08em] text-ink-faint">Your note</span>
          {programme.intake.note}
        </p>
      ) : null}
    </section>
  );
}

/** Risk Agent output. `drivenBy` is the whole point: every factor names its cause. */
function RiskFactors({ programme, domain }: { programme: AuditProgramme; domain: AuditDomain }) {
  return (
    <section className="mt-12">
      <div className="border-t border-line-strong pt-5">
        <h2 className="display text-[1.5rem] leading-snug text-ink">Assessed risk</h2>
        <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          What this profile exposes the firm to. Each factor names the answers that produced it,
          and carries the colour of the dimension it arises from.
        </p>
      </div>

      <ul className="mt-5 space-y-3">
        {programme.riskFactors.map((factor) => (
          <li key={factor.id}>
            <DimensionCard domain={domain} dimension={factor.dimension}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="meta flex items-center gap-2 uppercase tracking-[0.12em]">
                  <RiskDot rating={factor.severity} />
                  <span className="text-ink-muted">{RISK_LABELS[factor.severity]}</span>
                </p>
                <DimensionTag domain={domain} dimension={factor.dimension} />
              </div>

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
            </DimensionCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Obligations Agent output. Every row links to the page it was read from. */
function Obligations({ programme, domain }: { programme: AuditProgramme; domain: AuditDomain }) {
  return (
    <section className="mt-12">
      <div className="border-t border-line-strong pt-5">
        <h2 className="display text-[1.5rem] leading-snug text-ink">Obligations to test against</h2>
        <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          Read from the instruments themselves. Anything that could not be tied to a retrieved
          source was dropped rather than paraphrased — open each one and check it.
        </p>
      </div>

      <ol className="mt-5 space-y-3">
        {programme.obligations.map((obligation) => {
          const theme = obligation.theme ? getTheme(domain, obligation.theme) : null;

          return (
            <li
              key={obligation.id}
              className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-[0.9375rem] font-semibold leading-snug text-ink">
                  {obligation.reference}
                </p>
                {theme ? (
                  <span className="meta rounded border border-line bg-surface-sunken px-1.5 py-0.5 text-ink-muted">
                    {theme.label}
                  </span>
                ) : null}
              </div>

              <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
                {obligation.requirement}
              </p>
              <p className="meta mt-3 border-t border-line pt-3">
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
          );
        })}
      </ol>
    </section>
  );
}

/** The finished programme. Areas the auditor declined are listed, without steps, as part of the record. */
function Testing({ programme, domain }: { programme: AuditProgramme; domain: AuditDomain }) {
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

      <div className="mt-8 space-y-10">
        {approved.map((area, index) => {
          const dimension = dominantDimension(programme, area);

          return (
            <article key={area.id} aria-labelledby={`area-${area.id}`}>
              <DimensionCard domain={domain} dimension={dimension}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="meta flex items-center gap-2 uppercase tracking-[0.12em]">
                    <span className="text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
                    <RiskDot rating={area.riskRating} />
                    <span className="text-ink-muted">{RISK_LABELS[area.riskRating]} priority</span>
                  </p>
                  <DimensionTag domain={domain} dimension={dimension} />
                </div>

                <h3
                  id={`area-${area.id}`}
                  className="display mt-2 text-[1.375rem] leading-snug text-ink"
                >
                  {area.title}
                </h3>
                <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
                  {area.rationale}
                </p>

                {/* The criteria repeat here rather than only in the section
                    above: an auditor performing this step should not have to
                    scroll back to find what they are testing against. */}
                <ul className="meta mt-3.5 space-y-1 border-t border-line pt-3 text-ink-faint">
                  {area.testsObligations.map((id) => {
                    const obligation = obligationById.get(id);
                    return obligation ? <li key={id}>Tests {obligation.reference}</li> : null;
                  })}
                  {area.addressesRiskFactors.map((id) => {
                    const factor = riskById.get(id);
                    return factor ? <li key={id}>Answers {factor.factor}</li> : null;
                  })}
                </ul>
              </DimensionCard>

              <ol className="mt-3 space-y-3 sm:pl-6">
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
          );
        })}
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
