import { describe, expect, it } from "vitest";
import { normaliseDraft } from "./normalise";
import { SourceIndex } from "./sourceIndex";
import type { Draft, DraftEntry } from "./draftSchema";

const sources = new SourceIndex([
  { url: "https://www.mas.gov.sg/news/toolkit", title: "AI Risk Toolkit | MAS", pageAge: "2 days" },
  { url: "https://www.theiia.org/standards/x", title: "Standards update | The IIA", pageAge: null },
  { url: "https://auditboard.com/blog/y", title: "Continuous risk | AuditBoard", pageAge: null },
]);

const GOOD_SYNTHESIS =
  "MAS released a toolkit built with 24 financial institutions, turning the guidelines into 17 " +
  "concrete considerations. Audit now has a defensible benchmark to test the first line against.";

function entry(overrides: Partial<DraftEntry> = {}): DraftEntry {
  return {
    sourceId: "S01",
    category: "regulatory",
    headline: "MAS publishes an AI Risk Management Toolkit",
    synthesis: GOOD_SYNTHESIS,
    actionRequired: "Map the 17 considerations against the current AI control set before Q3 planning.",
    impact: "act-now",
    affects: ["Model risk", "Board reporting"],
    ...overrides,
  };
}

function draft(entries: DraftEntry[]): Draft {
  return { summary: "MAS moved AI oversight from principle to checklist this week.", entries };
}

describe("normaliseDraft", () => {
  it("publishes a well-formed entry and resolves its source", () => {
    const result = normaliseDraft(draft([entry()]), sources);

    expect(result.rejections).toEqual([]);
    expect(result.entries).toHaveLength(1);

    const published = result.entries[0]!;
    // The URL comes from the catalogue, never from the model.
    expect(published.sourceUrl).toBe("https://www.mas.gov.sg/news/toolkit");
    expect(published.sourceType).toBe("regulator");
    expect(published.sourceName).toBe("MAS");
  });

  it("accepts a capitalised category instead of throwing the edition away", () => {
    // The API does not enforce enums, so this is what the model actually
    // returns some of the time. It used to fail the whole parse.
    const result = normaliseDraft(draft([entry({ category: "Regulatory" })]), sources);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.category).toBe("regulatory");
  });

  it("maps loose impact wording onto the scale and never invents urgency", () => {
    const cases: Array<[string, string]> = [
      ["Act Now", "act-now"],
      ["high", "act-now"],
      ["plan for", "plan-for"],
      ["medium", "plan-for"],
      ["", "watch"],
      ["something else entirely", "watch"],
    ];

    for (const [raw, expected] of cases) {
      const result = normaliseDraft(draft([entry({ impact: raw })]), sources);
      expect(result.entries[0]!.impact, `impact "${raw}"`).toBe(expected);
    }
  });

  it("drops only the bad entry, keeping the rest of the edition", () => {
    const result = normaliseDraft(
      draft([
        entry(),
        entry({ sourceId: "S99", headline: "Cites a source that does not exist" }),
        entry({ sourceId: "S02", category: "automation", headline: "A second good entry here" }),
      ]),
      sources,
    );

    expect(result.entries).toHaveLength(2);
    expect(result.rejections).toHaveLength(1);
    expect(result.rejections[0]).toContain("unknown source");
  });

  it("rejects a synthesis that only restates the headline", () => {
    const result = normaliseDraft(draft([entry({ synthesis: "MAS published a toolkit." })]), sources);

    expect(result.entries).toHaveLength(0);
    expect(result.rejections[0]).toContain("adds nothing beyond the headline");
  });

  it("rejects an entry with no action for the audit function", () => {
    const result = normaliseDraft(draft([entry({ actionRequired: "   " })]), sources);

    expect(result.rejections[0]).toContain("does not say what audit should do");
  });

  it("rejects an unrecognisable category rather than guessing one", () => {
    const result = normaliseDraft(draft([entry({ category: "Sustainability" })]), sources);

    expect(result.entries).toHaveLength(0);
    expect(result.rejections[0]).toContain("not one of ours");
  });

  it("collapses two entries citing the same source", () => {
    const result = normaliseDraft(draft([entry(), entry({ headline: "Same source, again" })]), sources);

    expect(result.entries).toHaveLength(1);
    expect(result.rejections[0]).toContain("duplicates an earlier entry");
  });

  it("keeps an impossible publication date out rather than publishing it", () => {
    const kept = normaliseDraft(draft([entry({ publishedAt: "2026-09-02" })]), sources);
    expect(kept.entries[0]!.publishedAt).toBe("2026-09-02");

    for (const bad of ["2 September 2026", "2026-02-31", "not-a-date"]) {
      const result = normaliseDraft(draft([entry({ publishedAt: bad })]), sources);
      // The entry survives; only the untrustworthy date is dropped.
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]!.publishedAt, `date "${bad}"`).toBeUndefined();
    }
  });

  it("tidies whitespace and caps the number of affected areas", () => {
    const result = normaliseDraft(
      draft([
        entry({
          headline: "  Spaced   out   headline  ",
          affects: ["Model risk", "Model risk", " ITGC ", "AML", "Third-party", "Extra"],
        }),
      ]),
      sources,
    );

    expect(result.entries[0]!.headline).toBe("Spaced out headline");
    expect(result.entries[0]!.affects).toEqual(["Model risk", "ITGC", "AML", "Third-party"]);
  });
});

describe("SourceIndex", () => {
  it("assigns ids and resolves them tolerantly", () => {
    expect(sources.size).toBe(3);
    expect(sources.resolve("s01")?.url).toBe("https://www.mas.gov.sg/news/toolkit");
    expect(sources.resolve("  S02 ")?.type).toBe("profession");
    expect(sources.resolve("nope")).toBeNull();
  });

  it("orders primary sources ahead of the rest", () => {
    // The vendor blog must not be S01 when a regulator is available.
    expect(sources.sources[0]!.type).toBe("regulator");
    expect(sources.sources.at(-1)!.type).toBe("vendor");
  });
});
