import { CADENCE_LABEL, TIMEZONE } from "@/lib/config";
import { describeAge, formatTimestamp } from "@/lib/digest/dates";
import type { Digest } from "@/lib/digest/schema";
import { RegenerateButton } from "./RegenerateButton";

/**
 * Provenance. The generation timestamp appears here unconditionally, on every
 * edition, in every state — a reader should never have to wonder how old the
 * page is or take a banner's word for it.
 */
export function DigestFooter({
  digest,
  showActions = true,
}: {
  digest: Digest;
  /** The archive is read-only; provenance is shown there regardless. */
  showActions?: boolean;
}) {
  const { meta } = digest;

  return (
    <footer className="mt-16 border-t border-line pt-6">
      <dl className="meta grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <Row label="Generated">
          <time dateTime={digest.generatedAt}>{formatTimestamp(digest.generatedAt, TIMEZONE)}</time>
          <span className="text-ink-faint"> · {describeAge(digest.generatedAt)}</span>
        </Row>
        <Row label="Schedule">{CADENCE_LABEL} {TIMEZONE.split("/")[1]?.replace("_", " ")} time</Row>
        <Row label="Sources read">
          {meta.sourcesConsulted} publisher{meta.sourcesConsulted === 1 ? "" : "s"}
          {meta.trigger === "manual" ? " · run manually" : ""}
        </Row>
        <Row label="Model">{meta.model}</Row>
        {meta.ungroundedEntriesDropped > 0 ? (
          <Row label="Dropped">
            {meta.ungroundedEntriesDropped} item
            {meta.ungroundedEntriesDropped === 1 ? "" : "s"} whose source link could not be verified
          </Row>
        ) : null}
      </dl>

      {showActions ? (
        <div className="mt-8">
          <RegenerateButton />
        </div>
      ) : null}
    </footer>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 uppercase tracking-[0.08em] text-ink-faint">{label}</dt>
      <dd className="text-ink-muted">{children}</dd>
    </div>
  );
}
