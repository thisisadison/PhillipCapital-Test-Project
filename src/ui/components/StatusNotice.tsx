import type { StatusNotice as Notice } from "@/shared/status";

const TONE_STYLES: Record<Notice["tone"], string> = {
  info: "border-line bg-surface-sunken text-ink-muted",
  warning: "border-[var(--warn-line)] bg-[var(--warn-bg)] text-[var(--warn-ink)]",
  error: "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger-ink)]",
};

/**
 * The standing answer to "can I trust that this is current?".
 *
 * Shown above the content, never instead of it: when a refresh has failed, the
 * previous edition is still worth reading — it just must not be mistaken for
 * this week's.
 */
export function StatusNotice({ notice }: { notice: Notice }) {
  return (
    <div
      role={notice.tone === "info" ? "note" : "alert"}
      className={`rounded-lg border px-4 py-3.5 sm:px-5 ${TONE_STYLES[notice.tone]}`}
    >
      <p className="meta mb-1 font-semibold uppercase tracking-[0.08em] text-current opacity-80">
        {notice.title}
      </p>
      <p className="text-[0.9375rem] leading-relaxed text-current">{notice.detail}</p>
    </div>
  );
}
