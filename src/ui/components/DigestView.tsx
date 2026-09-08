import { CATEGORIES } from "@/server/domain/category";
import type { Digest } from "@/server/domain/digest";
import { deriveStats } from "@/shared/digestStats";
import type { StatusNotice as Notice } from "@/shared/status";
import { AtAGlance } from "./AtAGlance";
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
  showFooterActions?: boolean;
}) {
  const stats = deriveStats(digest);

  // Sections keep their declared order regardless of what the model returned,
  // so the page reads the same way every week. Empty sections are omitted.
  const populated = CATEGORIES.map((category) => ({
    category,
    entries: digest.entries.filter((entry) => entry.category === category.id),
  })).filter((section) => section.entries.length > 0);

  // `startIndex` is the running position across the page, which keeps the
  // entrance stagger continuous across section boundaries.
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

      <div className="mt-10">
        <AtAGlance stats={stats} />
      </div>

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

      <DigestFooter digest={digest} stats={stats} showActions={showFooterActions} />
    </>
  );
}
