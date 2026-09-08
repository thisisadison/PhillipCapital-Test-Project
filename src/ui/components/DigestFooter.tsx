import { CADENCE_LABEL, TIMEZONE } from "@/server/config";
import { describeAge, formatTimestamp } from "@/shared/dates";
import type { Digest } from "@/server/domain/digest";
import type { DigestStats } from "@/shared/digestStats";
import { StackedShareBar } from "@/ui/charts/StackedShareBar";
import { RegenerateButton } from "./RegenerateButton";

const SOURCE_TYPE_SLOT: Record<string, number> = {
  regulator: 1,
  profession: 2,
  firm: 3,
  vendor: 4,
  press: 5,
};

/**
 * Provenance.
 *
 * The generation timestamp appears here unconditionally, on every edition, in
 * every state — a reader should never have to wonder how old the page is or
 * take a banner's word for it. The source mix sits alongside it because it is
 * the same kind of claim: evidence about where this came from.
 */
export function DigestFooter({
  digest,
  stats,
  showActions = true,
}: {
  digest: Digest;
  stats: DigestStats;
  /** The archive is read-only; provenance still shows there. */
  showActions?: boolean;
}) {
  const { meta } = digest;

  return (
    <footer className="mt-16 border-t border-line pt-6">
      <h2 className="meta uppercase tracking-[0.14em] text-ink">Where this came from</h2>

      <div className="mt-4 max-w-[30rem]">
        <StackedShareBar
          tableCaption="Entries by publisher type"
          segments={stats.bySourceType.map((datum) => ({
            key: datum.type,
            label: datum.label,
            count: datum.count,
            color: `var(--series-${SOURCE_TYPE_SLOT[datum.type] ?? 5})`,
          }))}
        />
      </div>

      <dl className="meta mt-8 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <Row label="Generated">
          <time dateTime={digest.generatedAt}>{formatTimestamp(digest.generatedAt, TIMEZONE)}</time>
          <span className="text-ink-faint"> · {describeAge(digest.generatedAt)}</span>
        </Row>
        <Row label="Schedule">
          {CADENCE_LABEL} {TIMEZONE.split("/")[1]?.replace("_", " ")} time
        </Row>
        <Row label="Sources read">
          {meta.sourcesConsulted} publisher{meta.sourcesConsulted === 1 ? "" : "s"}
          {meta.trigger === "manual" ? " · run manually" : ""}
        </Row>
        <Row label="Model">{meta.model}</Row>
        {meta.entriesRejected > 0 ? (
          <Row label="Rejected">
            {meta.entriesRejected} draft item{meta.entriesRejected === 1 ? "" : "s"} did not pass
            checks and were left out
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
