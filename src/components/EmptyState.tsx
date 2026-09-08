import { CADENCE_LABEL } from "@/lib/config";
import { CATEGORIES } from "@/lib/digest/categories";
import type { StatusNotice as Notice } from "@/lib/digest/status";
import { StatusNotice } from "./StatusNotice";
import { RegenerateButton } from "./RegenerateButton";

/**
 * What a first-time visitor sees before anything has ever run.
 *
 * It explains what the page will contain and when, rather than showing an empty
 * frame or, worse, a placeholder edition that could be mistaken for real
 * content.
 */
export function EmptyState({ notice }: { notice: Notice | null }) {
  return (
    <div className="rise">
      <p className="meta uppercase tracking-[0.16em] text-ink-faint">No edition yet</p>

      <h1 className="display mt-3 text-[2.5rem] leading-[1.08] text-ink sm:text-[3.25rem]">
        Market &amp; Tech Trends
      </h1>

      <p className="display mt-6 max-w-[38rem] text-[1.3125rem] leading-[1.5] text-ink-muted sm:text-[1.4375rem]">
        A weekly one-pager on what changed in audit technology and the rules around it — researched,
        read and written up so the team does not have to.
      </p>

      {notice ? (
        <div className="mt-8">
          <StatusNotice notice={notice} />
        </div>
      ) : null}

      <div className="mt-12 border-t border-line-strong pt-6">
        <p className="meta uppercase tracking-[0.14em] text-ink">What each edition covers</p>
        <ul className="mt-4 space-y-4">
          {CATEGORIES.map((category) => (
            <li key={category.id} className="max-w-[var(--measure)]">
              <p className="display text-lg text-ink">{category.label}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-faint">{category.blurb}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 border-t border-line pt-6">
        <p className="meta mb-4 text-ink-faint">
          The research job runs {CADENCE_LABEL}. You can also run it now.
        </p>
        <RegenerateButton />
      </div>
    </div>
  );
}
