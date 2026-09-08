"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Only same-origin paths are accepted, so `next` cannot become an open redirect. */
function safeRedirect(target: string | undefined): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return "/";
  return target;
}

export function UnlockForm({ next }: { next?: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "That code was not accepted.");
        return;
      }

      router.replace(safeRedirect(next));
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <label htmlFor="access-code" className="meta block uppercase tracking-[0.1em] text-ink-muted">
        Access code
      </label>

      <input
        id="access-code"
        name="code"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={code}
        onChange={(event) => setCode(event.target.value)}
        aria-invalid={error !== null}
        aria-describedby={error ? "access-error" : undefined}
        className="mt-2 w-full rounded-lg border border-line bg-surface px-4 py-3 text-ink outline-none transition-colors duration-200 placeholder:text-ink-faint focus:border-[var(--accent)]"
        placeholder="Shared with the team"
      />

      {error ? (
        <p id="access-error" role="alert" className="mt-3 text-sm text-[var(--danger-ink)]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || code.trim().length === 0}
        className="mt-5 w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-canvas transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Checking…" : "Open the digest"}
      </button>
    </form>
  );
}
