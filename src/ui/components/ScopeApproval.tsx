"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  RISK_LABELS,
  dominantDimension,
  type Obligation,
  type RiskFactor,
  type ScopeArea,
} from "@/server/domain/programme";
import { getQuestion } from "@/server/domain/riskIntake";
import { seriesColor } from "@/ui/charts/palette";
import { DimensionRail, DimensionTag } from "./DimensionMark";
import { RiskDot } from "./RiskDot";

/**
 * The approval checkpoint.
 *
 * The Scope Agent proposes; the auditor decides. Everything is ticked to begin
 * with, because the auditor's job here is to review a proposal, not to fill in
 * a form — but nothing is drafted for an area they untick, and the estimate
 * updates as they go so the trade-off is visible while they make it.
 *
 * Each area shows the risk factors it answers and the obligations it tests, in
 * full. That is what makes this a decision rather than a guess: an area whose
 * rationale does not survive reading is one to drop.
 */

type State = { kind: "idle" } | { kind: "running" } | { kind: "error"; message: string };

/** Rough per-area drafting cost, from observed runs. Labelled as an estimate everywhere it appears. */
const COST_PER_AREA_USD = 0.02;

export function ScopeApproval({
  programmeId,
  areas,
  riskFactors,
  obligations,
}: {
  programmeId: string;
  areas: ScopeArea[];
  riskFactors: RiskFactor[];
  obligations: Obligation[];
}) {
  const [approved, setApproved] = useState<string[]>(() => areas.map((area) => area.id));
  const [state, setState] = useState<State>({ kind: "idle" });
  const router = useRouter();

  const riskById = new Map(riskFactors.map((factor) => [factor.id, factor]));
  const obligationById = new Map(obligations.map((obligation) => [obligation.id, obligation]));

  const busy = state.kind === "running";

  function toggle(areaId: string) {
    setApproved((current) =>
      current.includes(areaId) ? current.filter((id) => id !== areaId) : [...current, areaId],
    );
  }

  async function submit() {
    if (busy || approved.length === 0) return;

    setState({ kind: "running" });
    try {
      const response = await fetch(`/api/programme/${programmeId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approvedAreaIds: approved }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setState({
          kind: "error",
          message: typeof body.error === "string" ? body.error : "That did not work.",
        });
        return;
      }
      router.refresh();
    } catch {
      setState({ kind: "error", message: "Could not reach the server." });
    }
  }

  return (
    <section className="mt-12">
      <div className="border-t border-line-strong pt-5">
        <h2 className="display text-[1.5rem] leading-snug text-ink">Proposed scope</h2>
        <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.7] text-ink-muted">
          These are the control areas the Scope Agent proposes, each tied to the risks it answers
          and the obligations it tests. Untick anything that does not belong in this audit —
          detailed testing is written only for what you keep.
        </p>
      </div>

      <ul className="mt-6 space-y-4">
        {areas.map((area) => {
          const checked = approved.includes(area.id);
          const dimension = dominantDimension(area, riskFactors);
          const question = dimension ? getQuestion(dimension) : null;

          return (
            <li key={area.id}>
              <label
                className={`relative block cursor-pointer overflow-hidden rounded-xl border bg-surface p-5 pl-6 shadow-[var(--shadow-card)] transition-[opacity,border-color] duration-200 sm:p-6 sm:pl-7 ${
                  checked ? "border-line" : "border-dashed border-line opacity-55"
                }`}
              >
                {/* The rail carries the dimension this area mostly answers, so
                    an auditor can see at a glance whether unticking one leaves
                    a dimension with no coverage at all. */}
                <DimensionRail dimension={dimension} />

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(area.id)}
                    disabled={busy}
                    className="mt-1 h-4 w-4 shrink-0"
                    style={
                      question ? { accentColor: seriesColor(question.colorSlot) } : undefined
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="meta flex items-center gap-2 uppercase tracking-[0.12em]">
                        <RiskDot rating={area.riskRating} />
                        <span className="text-ink-muted">
                          {RISK_LABELS[area.riskRating]} priority
                        </span>
                      </p>
                      <DimensionTag dimension={dimension} />
                      {checked ? null : (
                        <span className="meta text-ink-faint">excluded from drafting</span>
                      )}
                    </div>

                    <h3 className="display mt-1.5 text-[1.25rem] leading-snug text-ink">
                      {area.title}
                    </h3>
                    <p className="mt-2 max-w-[var(--measure)] text-[0.9375rem] leading-[1.65] text-ink-muted">
                      {area.rationale}
                    </p>

                    <dl className="meta mt-4 space-y-3 border-t border-line pt-3.5">
                      <Trace label="Answers">
                        {area.addressesRiskFactors.map((id) => riskById.get(id)?.factor ?? null)}
                      </Trace>
                      <Trace label="Tests">
                        {area.testsObligations.map((id) => {
                          const obligation = obligationById.get(id);
                          return obligation
                            ? `${obligation.reference} — ${obligation.requirement}`
                            : null;
                        })}
                      </Trace>
                    </dl>
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-xl border border-line bg-surface-sunken p-5">
        <p className="text-[0.9375rem] leading-[1.65] text-ink">
          {approved.length} of {areas.length} areas approved.{" "}
          <span className="text-ink-muted">
            Drafting them costs roughly {formatEstimate(approved.length * COST_PER_AREA_USD)} — an
            estimate, not a quote.
          </span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={busy || approved.length === 0}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Drafting the testing steps…" : "Approve and draft testing"}
          </button>

          {approved.length < areas.length ? (
            <button
              type="button"
              onClick={() => setApproved(areas.map((area) => area.id))}
              disabled={busy}
              className="meta uppercase tracking-[0.1em] text-ink-faint underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline disabled:opacity-40"
            >
              Restore all
            </button>
          ) : null}
        </div>

        <p aria-live="polite" className="meta mt-3 leading-relaxed">
          {busy ? "This takes a minute or two. The page updates when it finishes." : null}
          {approved.length === 0 && !busy ? (
            <span className="text-ink-faint">Keep at least one area to draft anything.</span>
          ) : null}
          {state.kind === "error" ? (
            <span className="text-[var(--danger-ink)]">{state.message}</span>
          ) : null}
        </p>
      </div>
    </section>
  );
}

/** One traceability row. Nulls are dropped — a broken link shows as nothing, never as a blank bullet. */
function Trace({ label, children }: { label: string; children: (string | null)[] }) {
  const items = children.filter((item): item is string => Boolean(item));
  if (items.length === 0) return null;

  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 uppercase tracking-[0.08em] text-ink-faint">{label}</dt>
      <dd className="min-w-0 flex-1">
        <ul className="space-y-1 text-ink-muted">
          {items.map((item) => (
            <li key={item} className="leading-[1.5]">
              {item}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

function formatEstimate(amount: number): string {
  return amount < 0.01 ? "under $0.01" : `$${amount.toFixed(2)}`;
}
