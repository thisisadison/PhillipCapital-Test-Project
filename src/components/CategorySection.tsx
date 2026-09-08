import { EntryCard } from "./EntryCard";
import type { CategoryDefinition } from "@/lib/digest/categories";
import type { DigestEntry } from "@/lib/digest/schema";

/**
 * A category and its entries.
 *
 * The grouping is carried by a rule and a change of voice rather than boxes or
 * colour: the reader should feel the sections without the page acquiring chrome.
 */
export function CategorySection({
  category,
  entries,
  startIndex,
}: {
  category: CategoryDefinition;
  entries: DigestEntry[];
  /** Running position across the page, so the entrance stagger stays continuous. */
  startIndex: number;
}) {
  return (
    <section aria-labelledby={`category-${category.id}`} className="scroll-mt-8">
      <div className="border-t border-line-strong pt-5">
        <h2
          id={`category-${category.id}`}
          className="meta font-semibold uppercase tracking-[0.14em] text-ink"
        >
          {category.label}
          <span className="ml-2 font-normal text-ink-faint">
            {entries.length.toString().padStart(2, "0")}
          </span>
        </h2>
        <p className="mt-1.5 max-w-[var(--measure)] text-sm leading-relaxed text-ink-faint">
          {category.blurb}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-line px-5 py-6 text-sm text-ink-faint">
          Nothing this week met the bar for this section.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {entries.map((entry, offset) => (
            <EntryCard key={entry.id} entry={entry} index={startIndex + offset} />
          ))}
        </ul>
      )}
    </section>
  );
}
