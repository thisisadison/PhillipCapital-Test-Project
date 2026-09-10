import type { Metadata } from "next";
import { SiteHeader } from "@/ui/components/SiteHeader";
import { CADENCE_LABEL, COVERAGE_DAYS, STALE_AFTER_DAYS, TIMEZONE } from "@/server/config";
import { CATEGORIES } from "@/server/domain/category";
import { IMPACT_LABELS, IMPACT_LEVELS } from "@/server/domain/digest";
import { ALLOWED_DOMAINS_BY_CATEGORY } from "@/server/service/research/sourceCatalogue";
import { seriesColor } from "@/ui/charts/palette";

export const metadata: Metadata = { title: "Method" };

/**
 * How the digest is produced, and which sources it may draw on.
 *
 * This page exists so the digest can be challenged. An audit team should not
 * have to take "we searched authoritative sources" on trust — the actual
 * allowlist is printed here, and if a publisher they rely on is missing they can
 * say so.
 */
export default function MethodPage() {
  const allDomains = [...new Set(Object.values(ALLOWED_DOMAINS_BY_CATEGORY).flat())].sort();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
      <SiteHeader current="/method" />

      <main className="pt-10 sm:pt-14">
        <p className="meta uppercase tracking-[0.16em] text-ink-faint">How this is made</p>
        <h1 className="display mt-3 text-[2.25rem] leading-[1.1] text-ink sm:text-[2.75rem]">
          Method
        </h1>

        <p className="mt-6 max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          Every {COVERAGE_DAYS} days a scheduled job researches each section below, then edits the
          findings into one page. It runs {CADENCE_LABEL}{" "}
          {TIMEZONE.split("/")[1]?.replace("_", " ")} time. Nothing is written by hand between runs.
        </p>

        <Section title="What gets searched">
          <p>
            Search is restricted to the allowlist at the bottom of this page. That is the main
            quality control: a search-optimised article restating a MAS circular cannot enter the
            candidate set at all, so nothing later has to decide between it and the regulator.
          </p>
        </Section>

        <Section title="How links are guaranteed">
          <p>
            The editing step never writes a URL. It picks from a numbered catalogue of pages the
            search actually returned, and the link is filled in afterwards from that catalogue. A
            fabricated or mistyped link is therefore not something that gets caught — it is
            something that cannot be expressed.
          </p>
        </Section>

        <Section title="What gets rejected">
          <p>
            Draft items are dropped if they cite a source outside the catalogue, land in no
            recognised section, or carry a synthesis that only restates the headline. Rejections are
            counted in the footer of each edition. A run fails only if nothing survives.
          </p>
        </Section>

        <Section title="How freshness is reported">
          <p>
            The generation timestamp is shown on every edition, always. If a scheduled run fails
            afterwards, the page says so above the content rather than presenting the previous
            edition as current. After {STALE_AFTER_DAYS} days without a successful run the edition
            is labelled out of date.
          </p>
        </Section>

        <Section title="Impact levels">
          <dl className="space-y-2">
            {IMPACT_LEVELS.map((level) => (
              <div key={level} className="flex gap-3">
                <dt className="meta w-20 shrink-0 uppercase tracking-[0.08em] text-ink">
                  {IMPACT_LABELS[level]}
                </dt>
                <dd className="text-sm text-ink-muted">
                  {level === "act-now"
                    ? "A dated obligation or a live exposure."
                    : level === "plan-for"
                      ? "Shapes the next planning or budget cycle."
                      : "Worth knowing; nothing to do yet."}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Sections">
          <ul className="space-y-4">
            {CATEGORIES.map((category) => (
              <li key={category.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: seriesColor(category.colorSlot) }}
                />
                <div>
                  <p className="display text-lg text-ink">{category.label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-faint">{category.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="The audit programme designer">
          <p>
            A separate pipeline, reached from the Programme tab. It answers a different question: not
            what changed this week, but what an AML/CFT audit of this firm should actually cover.
          </p>
          <p>
            The intake is not a questionnaire of our own devising. MAS requires a capital markets
            services licence holder to identify and assess its ML/TF risk having regard to its
            customers, the products and services it offers, its delivery channels and the countries
            it deals with — so those are the four questions, and answering them <em>is</em> the risk
            assessment. A fifth, optional, asks where the team already suspects its controls are
            thin, which is what makes the output an internal audit programme rather than a
            compliance walkthrough. Each dimension owns a colour, and that colour follows it onto
            the risk factors it produces and the scope areas that answer them.
          </p>
          <p>
            Four agents run, with a human decision in the middle. A <strong>Risk Agent</strong> reads
            the intake selections and assesses what this firm is exposed to; it has no tools, because
            its job is judgement about the firm rather than research. In parallel, a{" "}
            <strong>MAS Agent</strong> searches the instruments themselves — the only agent with
            network access — and extracts obligations, each tied to a page it actually retrieved. A{" "}
            <strong>Scope Agent</strong> then merges the two into proposed control areas, and an area
            it cannot tie to both an assessed risk and a citable obligation is dropped rather than
            shown.
          </p>
          <p>
            The pipeline stops there. You approve or drop each area, and only then does the{" "}
            <strong>Evidence Agent</strong> write testing steps — for the areas you kept, and no
            others. That checkpoint is not a confirmation dialog: it is the point at which the
            expensive stage is pointed at the right work.
          </p>
          <p>
            Every stage is persisted and shown with what it produced, what it cost and anything it
            dropped. The intake, the risk factors and the obligations sit ahead of the programme on
            the page rather than behind it, because the reasoning is what lets an auditor disagree
            with a conclusion by pointing at the step that produced it.
          </p>
          <p>
            Coverage is reported against a fixed list of the obligation themes an AML/CFT audit is
            normally expected to reach — due diligence, beneficial ownership, PEPs, sanctions
            screening, suspicious transaction reporting and the rest. Themes the run did not reach
            are shown as gaps rather than omitted, because a tool that displayed only its hits would
            let silence read as &ldquo;nothing there&rdquo;. The themes are named; the paragraph
            numbers are not, because those are retrieved from the instrument at run time rather than
            hard-coded into a tool that would then keep quoting a reissued notice.
          </p>
          <p>
            A findings-and-reporting stage is deliberately absent. Findings require evidence from
            fieldwork that has not happened yet, and a tool that generated them from a programme
            alone would be inventing audit results.
          </p>
        </Section>

        <Section title={`Source allowlist (${allDomains.length} publishers)`}>
          <p className="mb-4">
            If something your team relies on is missing, it can be added — the list is a single file
            in the codebase.
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {allDomains.map((domain) => (
              <li
                key={domain}
                className="meta rounded border border-line bg-surface-sunken px-1.5 py-0.5 text-ink-muted"
              >
                {domain}
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-line pt-6">
      <h2 className="meta uppercase tracking-[0.14em] text-ink">{title}</h2>
      <div className="mt-3 max-w-[var(--measure)] space-y-3 text-[0.9375rem] leading-[1.7] text-ink-muted">
        {children}
      </div>
    </section>
  );
}
