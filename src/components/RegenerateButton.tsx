"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Outcome =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

/**
 * The manual trigger, for demos and for recovering from a failed scheduled run.
 *
 * A run takes minutes, so the button holds its running state and reports the
 * real outcome rather than optimistically declaring success. Rate-limit refusals
 * come back from the server as plain sentences and are shown as-is.
 */
export function RegenerateButton() {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [isRefreshing, startTransition] = useTransition();
  const router = useRouter();

  const busy = outcome.kind === "running" || isRefreshing;

  async function regenerate() {
    setOutcome({ kind: "running" });

    try {
      const response = await fetch("/api/regenerate", { method: "POST" });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setOutcome({
          kind: "error",
          message:
            typeof body.error === "string"
              ? body.error
              : "The run could not be started. Try again shortly.",
        });
        return;
      }

      setOutcome({
        kind: "done",
        message: `Published the edition of ${body.date} with ${body.entries} entries.`,
      });
      startTransition(() => router.refresh());
    } catch {
      setOutcome({
        kind: "error",
        message: "Could not reach the server. The digest on screen is unchanged.",
      });
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={regenerate}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Spinner /> : null}
        {outcome.kind === "running" ? "Researching…" : "Regenerate now"}
      </button>

      <p aria-live="polite" className="meta max-w-[var(--measure)] leading-relaxed">
        {outcome.kind === "running"
          ? "This takes a few minutes — the pipeline is searching and reading sources."
          : null}
        {outcome.kind === "done" ? outcome.message : null}
        {outcome.kind === "error" ? (
          <span className="text-[var(--danger-ink)]">{outcome.message}</span>
        ) : null}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="motion-safe:animate-spin"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
