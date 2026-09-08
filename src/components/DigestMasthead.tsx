import { formatEditionDate, formatShortDate } from "@/lib/digest/dates";
import type { Digest } from "@/lib/digest/schema";

/**
 * The one focal point on the page: the edition date, and the lede that says
 * what actually happened this week.
 */
export function DigestMasthead({ digest }: { digest: Digest }) {
  return (
    <div className="rise">
      <p className="meta uppercase tracking-[0.16em] text-ink-faint">
        <time dateTime={digest.date}>{formatEditionDate(digest.date)}</time>
        <span aria-hidden="true" className="mx-2 text-line-strong">
          ·
        </span>
        <span>
          covering {formatShortDate(digest.coversFrom)} – {formatShortDate(digest.coversTo)}
        </span>
      </p>

      <h1 className="display mt-3 text-[2.5rem] leading-[1.08] text-ink sm:text-[3.25rem]">
        Market &amp; Tech Trends
      </h1>

      <p className="display mt-6 max-w-[38rem] text-[1.3125rem] leading-[1.5] text-ink-muted sm:text-[1.4375rem]">
        {digest.summary}
      </p>
    </div>
  );
}
