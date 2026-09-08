import { CATEGORIES } from "@/lib/digest/categories";
import type { Digest } from "@/lib/digest/schema";
import type { StatusNotice as Notice } from "@/lib/digest/status";
import { CategorySection } from "./CategorySection";
import { DigestFooter } from "./DigestFooter";
import { DigestMasthead } from "./DigestMasthead";
import { StatusNotice } from "./StatusNotice";

/**
 * A whole edition. Shared by the current digest and the archive, so a past
 * edition is presented exactly as it was — with its own generation date, which
 * is the only thing distinguishing it from the current one.
 */
export function DigestView({
  digest,
  notice,
  showFooterActions = true,
}: {
  digest: Digest;
  notice?: Notice | null;
  /** Hidden on archived editions, which are read-only. Provenance still shows. */
  showFooterActions?: boolean;
}) {
  // Categories keep their declared order regardless of what the model returned,
  // so the page reads the same way every week.
  const populated = CATEGORIES.map((category) => ({
    category,
    entries: digest.entries.filter((entry) => entry.category === category.id),
  })).filter((section) => section.entries.length > 0);

  // `startIndex` is the running position across the whole page, which keeps the
  // entrance stagger continuous across section boundaries. There are at most
  // three sections, so counting the preceding ones costs nothing.
  const sections = populated.map((section, index) => ({
    ...section,
    startIndex: populated
      .slice(0, index)
      .reduce((total, earlier) => total + earlier.entries.length, 0),
  }));

  return (
    <>
      <DigestMasthead digest={digest} />

      {notice ? (
        <div className="mt-8">
          <StatusNotice notice={notice} />
        </div>
      ) : null}

      <div id="digest" className="mt-14 space-y-14">
        {sections.map((section) => (
          <CategorySection
            key={section.category.id}
            category={section.category}
            entries={section.entries}
            startIndex={section.startIndex}
          />
        ))}
      </div>

      <DigestFooter digest={digest} showActions={showFooterActions} />
    </>
  );
}
