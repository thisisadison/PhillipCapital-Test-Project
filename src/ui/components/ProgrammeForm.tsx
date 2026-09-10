"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLE =
  "Retail and institutional brokerage. Onboarding is largely digital, with a growing share of " +
  "non-resident clients from higher-risk jurisdictions. Third-party introducers bring roughly a " +
  "fifth of new accounts. Transaction monitoring thresholds were last tuned two years ago.";

type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "error"; message: string };

/**
 * The generation form.
 *
 * The risk context is a free-text box rather than a set of dropdowns on
 * purpose: what makes a programme risk-based is the auditor's own judgement
 * about their firm, and a fixed taxonomy would quietly replace that judgement
 * with ours.
 */
export function ProgrammeForm() {
  const [riskContext, setRiskContext] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const router = useRouter();

  const busy = state.kind === "running";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setState({ kind: "running" });
    try {
      const response = await fetch("/api/programme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ riskContext }),
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
    <form onSubmit={submit} className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <label htmlFor="risk-context" className="meta uppercase tracking-[0.1em] text-ink">
        The firm&apos;s risk context
      </label>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">
        Business lines, client mix, channels, and anything your risk assessment already flags. The
        programme is built around what you write here — it is what makes the coverage risk-based
        rather than generic.
      </p>

      <textarea
        id="risk-context"
        value={riskContext}
        onChange={(event) => setRiskContext(event.target.value)}
        rows={6}
        placeholder={EXAMPLE}
        disabled={busy}
        className="mt-3 w-full resize-y rounded-lg border border-line bg-surface-sunken px-3.5 py-3 text-[0.9375rem] leading-relaxed text-ink outline-none transition-colors duration-200 placeholder:text-ink-faint focus:border-[var(--accent)] disabled:opacity-60"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || riskContext.trim().length < 40}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Researching and drafting…" : "Generate programme"}
        </button>

        <button
          type="button"
          onClick={() => setRiskContext(EXAMPLE)}
          disabled={busy}
          className="meta uppercase tracking-[0.1em] text-ink-faint underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline disabled:opacity-40"
        >
          Use the example
        </button>
      </div>

      <p aria-live="polite" className="meta mt-3 leading-relaxed">
        {busy ? "This takes a couple of minutes — it is searching MAS and FATF sources first." : null}
        {state.kind === "error" ? (
          <span className="text-[var(--danger-ink)]">{state.message}</span>
        ) : null}
      </p>
    </form>
  );
}
