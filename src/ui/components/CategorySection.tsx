import { EntryCard } from "./EntryCard";
import type { CategoryDefinition } from "@/server/domain/category";
import type { DigestEntry } from "@/server/domain/digest";
import { seriesColor } from "@/ui/charts/palette";

/**
 * A section and its entries.
 *
 * The grouping is carried by a rule, a change of voice and the section's own
 * colour key rather than by boxes: the reader should feel the sections without
 * the page acquiring chrome.
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
    <section id={category.id} aria-labelledby={`heading-${category.id}`} className="scroll-mt-8">
      <div className="border-t border-line-strong pt-5">
        <h2
          id={`heading-${category.id}`}
          className="meta flex items-center gap-2 font-semibold uppercase tracking-[0.14em] text-ink"
        >
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: seriesColor(category.colorSlot) }}
          />
          {category.label}
          <span className="font-normal text-ink-faint">
            {entries.length.toString().padStart(2, "0")}
          </span>
        </h2>
        <p className="mt-1.5 max-w-[var(--measure)] text-sm leading-relaxed text-ink-faint">
          {category.blurb}
        </p>
      </div>

      <ul className="mt-5 space-y-4">
        {entries.map((entry, offset) => (
          <EntryCard key={entry.id} entry={entry} index={startIndex + offset} />
        ))}
      </ul>
    </section>
  );
}
