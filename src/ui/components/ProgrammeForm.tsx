"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuditDomain, AuditDomainId } from "@/server/domain/auditDomain";
import { seriesColor } from "@/ui/charts/palette";

/**
 * The audit-type picker, then the risk intake for whichever type was chosen.
 *
 * Internal Audit does not only audit AML. The annual plan carries technology,
 * operations, finance and conduct work too, and each has its own risk
 * dimensions drawn from its own framework — MAS's four ML/TF dimensions for a
 * financial crime audit, the TRM Guidelines and ITGC pillars for a technology
 * one. So the audit type is the first question, and every question after it
 * comes from that domain's definition rather than from this file.
 *
 * The domains are passed in from the server rather than imported here, so
 * adding one never means touching this component.
 */

type Selections = Record<string, string[]>;
type State = { kind: "idle" } | { kind: "running" } | { kind: "error"; message: string };

function emptySelections(domain: AuditDomain): Selections {
  return Object.fromEntries(domain.dimensions.map((dimension) => [dimension.id, []]));
}

export function ProgrammeForm({
  domains,
  examples,
}: {
  domains: AuditDomain[];
  /** A worked profile per domain, so a first run needs no domain knowledge. */
  examples: Record<string, Selections>;
}) {
  const [domainId, setDomainId] = useState<AuditDomainId | null>(null);
  const [selections, setSelections] = useState<Selections>({});
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const router = useRouter();

  const domain = domains.find((entry) => entry.id === domainId) ?? null;
  const busy = state.kind === "running";

  const missing = domain
    ? domain.dimensions.filter(
        (dimension) => dimension.required && (selections[dimension.id]?.length ?? 0) === 0,
      )
    : [];
  const complete = domain !== null && missing.length === 0;

  function chooseDomain(next: AuditDomain) {
    // Switching audit type discards the answers: the dimensions are different,
    // so carrying selections across would either error or silently drop them.
    setDomainId(next.id);
    setSelections(emptySelections(next));
    setNote("");
    setState({ kind: "idle" });
  }

  function toggle(dimensionId: string, optionId: string) {
    setSelections((current) => {
      const chosen = current[dimensionId] ?? [];
      return {
        ...current,
        [dimensionId]: chosen.includes(optionId)
          ? chosen.filter((id) => id !== optionId)
          : [...chosen, optionId],
      };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !complete || !domain) return;

    setState({ kind: "running" });
    try {
      const response = await fetch("/api/programme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          domain: domain.id,
          selections,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setState({
          kind: "error",
          message: typeof body.error === "string" ? body.error : "That did not work.",
        });
        return;
      }

      router.push(`/programme/${body.id}`);
      router.refresh();
    } catch {
      setState({ kind: "error", message: "Could not reach the server." });
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="disabled:opacity-60">
        <legend className="meta float-left w-full uppercase tracking-[0.1em] text-ink">
          What are you auditing?
        </legend>

        {/* `clear-both` because the legend above is a full-width float (see the
            dimension fieldsets for why it has to be), and a grid container
            establishes its own formatting context: rather than flowing under
            the float it shrinks to fit beside it, which collapses this row to a
            sliver. A plain block would have flowed under it. */}
        <div className="mt-3 grid clear-both gap-2 sm:grid-cols-2">
          {domains.map((entry) => {
            const active = entry.id === domainId;
            return (
              <label
                key={entry.id}
                className={`cursor-pointer rounded-xl border p-4 transition-colors duration-150 ${
                  active
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <input
                  type="radio"
                  name="audit-domain"
                  checked={active}
                  onChange={() => chooseDomain(entry)}
                  className="sr-only"
                />
                <span className="flex items-baseline gap-2 text-[0.9375rem] font-semibold text-ink">
                  <span aria-hidden="true" className={active ? "text-[var(--accent-ink)]" : "text-ink-faint"}>
                    {active ? "◉" : "○"}
                  </span>
                  {entry.label}
                </span>
                <span className="mt-1 block pl-5 text-sm leading-relaxed text-ink-faint">
                  {entry.blurb}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {domain === null ? (
        <p className="meta mt-4 text-ink-faint">
          Pick an audit type. The questions that follow come from that audit&apos;s own risk
          framework.
        </p>
      ) : (
        <>
          <p className="meta mt-5 border-l-2 border-line-strong pl-3 leading-relaxed text-ink-muted">
            {domain.frameworkNote}
          </p>

          <div className="mt-5 space-y-4">
            {domain.dimensions.map((dimension) => {
              const chosen = selections[dimension.id] ?? [];
              const accent = dimension.colorSlot ? seriesColor(dimension.colorSlot) : null;

              return (
                <fieldset
                  key={dimension.id}
                  disabled={busy}
                  className="relative overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] disabled:opacity-60 sm:p-6 sm:pl-7"
                >
                  {/* The dimension's own colour, or the neutral rule for the
                      control-weakness dimension. See DimensionMark. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-[3px]"
                    style={{ backgroundColor: accent ?? "var(--line-strong)" }}
                  />

                  {/* Floated rather than left in its default position: a native
                      legend renders *on* the fieldset's top border, which cuts a
                      notch through the card edge and the colour rail. */}
                  <legend className="meta float-left flex w-full flex-wrap items-center gap-2 uppercase tracking-[0.1em] text-ink">
                    {dimension.label}
                    <span className="normal-case tracking-normal text-ink-faint">
                      {dimension.required ? "required" : "optional"}
                    </span>
                    {chosen.length > 0 ? (
                      <span
                        className="rounded-full px-1.5 py-0.5 normal-case tracking-normal text-canvas"
                        style={{ backgroundColor: accent ?? "var(--ink-muted)" }}
                      >
                        {chosen.length}
                      </span>
                    ) : null}
                  </legend>

                  <p className="mt-1.5 max-w-[var(--measure)] text-sm leading-relaxed text-ink-faint">
                    {dimension.help}
                  </p>

                  <div className="mt-3.5 flex flex-wrap gap-2">
                    {dimension.options.map((option) => {
                      const checked = chosen.includes(option.id);
                      return (
                        <label
                          key={option.id}
                          className={`cursor-pointer rounded-lg border px-3 py-2 text-sm leading-tight transition-colors duration-150 ${
                            checked
                              ? "text-ink"
                              : "border-line bg-surface-sunken text-ink-muted hover:border-line-strong"
                          }`}
                          style={
                            checked
                              ? {
                                  borderColor: accent ?? "var(--ink-muted)",
                                  backgroundColor: `color-mix(in srgb, ${accent ?? "var(--ink-muted)"} 10%, transparent)`,
                                }
                              : undefined
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(dimension.id, option.id)}
                            className="sr-only"
                          />
                          {/* Selection is never colour alone: the tick is the
                              cue, the tint is reinforcement. */}
                          <span
                            aria-hidden="true"
                            className={`mr-1.5 ${checked ? "" : "text-ink-faint"}`}
                            style={checked ? { color: accent ?? "var(--ink)" } : undefined}
                          >
                            {checked ? "✓" : "□"}
                          </span>
                          {option.label}
                          {option.hint ? (
                            <span className="meta mt-0.5 block text-ink-faint">{option.hint}</span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}

            <div className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <label htmlFor="intake-note" className="meta uppercase tracking-[0.1em] text-ink">
                Anything else
                <span className="ml-2 normal-case tracking-normal text-ink-faint">optional</span>
              </label>
              <p className="mt-1.5 max-w-[var(--measure)] text-sm leading-relaxed text-ink-faint">
                One line, if there is something the dimensions above do not cover. The programme
                works without it.
              </p>
              <textarea
                id="intake-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={1000}
                disabled={busy}
                className="mt-3 w-full resize-y rounded-lg border border-line bg-surface-sunken px-3.5 py-3 text-[0.9375rem] leading-relaxed text-ink outline-none transition-colors duration-200 placeholder:text-ink-faint focus:border-[var(--accent)] disabled:opacity-60"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || !complete}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Assessing and scoping…" : "Run risk assessment"}
            </button>

            {examples[domain.id] ? (
              <button
                type="button"
                onClick={() => setSelections(examples[domain.id] ?? {})}
                disabled={busy}
                className="meta uppercase tracking-[0.1em] text-ink-faint underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline disabled:opacity-40"
              >
                Use the example profile
              </button>
            ) : null}
          </div>

          <p aria-live="polite" className="meta mt-3 leading-relaxed">
            {busy
              ? "Two agents are running in parallel — one assessing the firm, one reading the applicable requirements. This takes a couple of minutes."
              : null}
            {state.kind === "error" ? (
              <span className="text-[var(--danger-ink)]">{state.message}</span>
            ) : null}
            {state.kind === "idle" && !complete ? (
              <span className="text-ink-faint">
                Still to answer: {missing.map((dimension) => dimension.label).join(", ")}.
              </span>
            ) : null}
          </p>
        </>
      )}
    </form>
  );
}
