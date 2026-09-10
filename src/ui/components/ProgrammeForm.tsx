"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INTAKE_QUESTIONS, type IntakeQuestion } from "@/server/domain/riskIntake";

/**
 * The risk intake.
 *
 * Checkboxes, not a blank box. A blank box is the interface of a chat: it asks
 * the auditor to already know what matters, and it gives the pipeline nothing
 * it can trace a conclusion back to. A fixed vocabulary means every risk factor
 * the next screen shows can name the selection that produced it.
 *
 * The three questions that drive scope are required. The fourth — known
 * concerns — is where an auditor's own knowledge of their firm enters, and the
 * free-text note is for the one thing no option list anticipated.
 */

type Selections = Record<IntakeQuestion["id"], string[]>;

const EMPTY: Selections = { businessLines: [], clientBase: [], channels: [], riskFlags: [] };

/** A profile that produces a non-trivial programme, for a first run. */
const EXAMPLE: Selections = {
  businessLines: ["retail-brokerage", "institutional-brokerage"],
  clientBase: ["non-resident", "corporate", "high-risk-jurisdictions"],
  channels: ["digital", "introducers"],
  riskFlags: ["monitoring-stale", "rapid-growth"],
};

type State = { kind: "idle" } | { kind: "running" } | { kind: "error"; message: string };

const REQUIRED: IntakeQuestion["id"][] = ["businessLines", "clientBase", "channels"];

export function ProgrammeForm() {
  const [selections, setSelections] = useState<Selections>(EMPTY);
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const router = useRouter();

  const busy = state.kind === "running";
  const complete = REQUIRED.every((id) => selections[id].length > 0);

  function toggle(questionId: IntakeQuestion["id"], optionId: string) {
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
    <form
      onSubmit={submit}
      className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
    >
      <div className="space-y-7">
        {INTAKE_QUESTIONS.map((question) => (
          <fieldset key={question.id} disabled={busy} className="disabled:opacity-60">
            <legend className="meta uppercase tracking-[0.1em] text-ink">
              {question.label}
              {REQUIRED.includes(question.id) ? null : (
                <span className="ml-2 normal-case tracking-normal text-ink-faint">optional</span>
              )}
            </legend>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">{question.help}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {question.options.map((option) => {
                const checked = selections[question.id].includes(option.id);
                return (
                  <label
                    key={option.id}
                    // A chip rather than a stacked checkbox list: four questions
                    // of six options each is a long form vertically, and the
                    // whole point is that this is quicker than writing prose.
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-sm leading-tight transition-colors duration-150 ${
                      checked
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-ink"
                        : "border-line bg-surface-sunken text-ink-muted hover:border-line-strong"
                    }`}
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
                      className={`mr-1.5 ${checked ? "text-[var(--accent-ink)]" : "text-ink-faint"}`}
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
        ))}

        <div>
          <label htmlFor="intake-note" className="meta uppercase tracking-[0.1em] text-ink">
            Anything else
            <span className="ml-2 normal-case tracking-normal text-ink-faint">optional</span>
          </label>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">
            One line, if there is something the options above do not cover. The programme works
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

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
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
            Select at least one option under business lines, client base and channels.
          </span>
        ) : null}
      </p>
    </form>
  );
}
