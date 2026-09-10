"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INTAKE_QUESTIONS, type DimensionId } from "@/server/domain/riskIntake";
import { seriesColor } from "@/ui/charts/palette";

/**
 * The risk intake.
 *
 * One card per risk dimension, each carrying the dimension's colour on its
 * left edge — the same device the digest uses for its sections, and for the
 * same reason: colour here is a key, not decoration. That hairline follows the
 * dimension through the whole product, onto the risk factors it produces and
 * the scope areas that answer them, so a reader can trace customer risk across
 * three screens by colour alone.
 *
 * The four required dimensions are MAS's own; the fifth is ours. See
 * `riskIntake.ts` for why that split matters.
 */

type Selections = Record<DimensionId, string[]>;

const EMPTY: Selections = { customer: [], product: [], channel: [], country: [], controls: [] };

/** A profile that produces a non-trivial programme, for a first run. */
const EXAMPLE: Selections = {
  customer: ["retail-non-resident", "corporate", "nominee-structures"],
  product: ["cash-equities", "leveraged-fx-cfd", "third-party-transfers"],
  channel: ["online-platform", "introducers"],
  country: ["asean", "greater-china", "offshore-centres"],
  controls: ["monitoring-stale", "rapid-growth"],
};

type State = { kind: "idle" } | { kind: "running" } | { kind: "error"; message: string };

export function ProgrammeForm() {
  const [selections, setSelections] = useState<Selections>(EMPTY);
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const router = useRouter();

  const busy = state.kind === "running";
  const missing = INTAKE_QUESTIONS.filter(
    (question) => question.required && selections[question.id].length === 0,
  );
  const complete = missing.length === 0;

  function toggle(questionId: DimensionId, optionId: string) {
    setSelections((current) => {
      const chosen = current[questionId];
      return {
        ...current,
        [questionId]: chosen.includes(optionId)
          ? chosen.filter((id) => id !== optionId)
          : [...chosen, optionId],
      };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !complete) return;

    setState({ kind: "running" });
    try {
      const response = await fetch("/api/programme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...selections, ...(note.trim() ? { note: note.trim() } : {}) }),
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
      <div className="space-y-4">
        {INTAKE_QUESTIONS.map((question) => {
          const chosen = selections[question.id];

          return (
            <fieldset
              key={question.id}
              disabled={busy}
              className="relative overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] disabled:opacity-60 sm:p-6 sm:pl-7"
            >
              {/* The dimension's own colour: the one place its identity appears
                  on the card, without adding chrome. */}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ backgroundColor: seriesColor(question.colorSlot) }}
              />

              {/* Floated rather than left in its default position: a native
                  legend renders *on* the fieldset's top border, which cuts a
                  notch through the card edge and the colour rail. Floating it
                  full-width puts it back in normal flow, and the card's
                  `overflow-hidden` already contains the float. */}
              <legend className="meta float-left flex w-full flex-wrap items-center gap-2 uppercase tracking-[0.1em] text-ink">
                {question.label}
                {question.required ? (
                  <span className="normal-case tracking-normal text-ink-faint">
                    MAS risk dimension
                  </span>
                ) : (
                  <span className="normal-case tracking-normal text-ink-faint">optional</span>
                )}
                {chosen.length > 0 ? (
                  <span
                    className="rounded-full px-1.5 py-0.5 normal-case tracking-normal text-canvas"
                    style={{ backgroundColor: seriesColor(question.colorSlot) }}
                  >
                    {chosen.length}
                  </span>
                ) : null}
              </legend>

              <p className="mt-1.5 max-w-[var(--measure)] text-sm leading-relaxed text-ink-faint">
                {question.help}
              </p>

              <div className="mt-3.5 flex flex-wrap gap-2">
                {question.options.map((option) => {
                  const checked = chosen.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      // A chip rather than a stacked checkbox list: five
                      // dimensions of seven options each is a very long form
                      // vertically, and the whole point is that this is quicker
                      // than writing prose.
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-sm leading-tight transition-colors duration-150 ${
                        checked
                          ? "text-ink"
                          : "border-line bg-surface-sunken text-ink-muted hover:border-line-strong"
                      }`}
                      style={
                        checked
                          ? {
                              borderColor: seriesColor(question.colorSlot),
                              backgroundColor: `color-mix(in srgb, ${seriesColor(question.colorSlot)} 10%, transparent)`,
                            }
                          : undefined
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(question.id, option.id)}
                        className="sr-only"
                      />
                      {/* Selection is never colour alone: the tick is the cue,
                          the tint is reinforcement. */}
                      <span
                        aria-hidden="true"
                        className={`mr-1.5 ${checked ? "" : "text-ink-faint"}`}
                        style={checked ? { color: seriesColor(question.colorSlot) } : undefined}
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
            One line, if there is something the dimensions above do not cover. The programme works
            without it.
          </p>
          <textarea
            id="intake-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={1000}
            disabled={busy}
            placeholder="e.g. A new digital asset desk launches next quarter."
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
          {busy ? "Assessing and scoping…" : "Plan the scope"}
        </button>

        <button
          type="button"
          onClick={() => setSelections(EXAMPLE)}
          disabled={busy}
          className="meta uppercase tracking-[0.1em] text-ink-faint underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline disabled:opacity-40"
        >
          Use the example profile
        </button>
      </div>

      <p aria-live="polite" className="meta mt-3 leading-relaxed">
        {busy
          ? "Two agents are running in parallel — one assessing the firm, one reading MAS and FATF. This takes a couple of minutes."
          : null}
        {state.kind === "error" ? (
          <span className="text-[var(--danger-ink)]">{state.message}</span>
        ) : null}
        {state.kind === "idle" && !complete ? (
          <span className="text-ink-faint">
            Still to answer: {missing.map((question) => question.label).join(", ")}.
          </span>
        ) : null}
      </p>
    </form>
  );
}
