import { describe, expect, it } from "vitest";
import { normaliseProgramme } from "./normaliseProgramme";
import { SourceIndex } from "../synthesis/sourceIndex";
import type { DraftSection, ProgrammeDraft } from "./programmeDraftSchema";

const sources = new SourceIndex([
  { url: "https://www.mas.gov.sg/regulation/notices/notice-626", title: "Notice 626 | MAS", pageAge: null },
  { url: "https://www.fatf-gafi.org/recommendations.html", title: "Recommendations | FATF", pageAge: null },
]);

const RATIONALE =
  "A fifth of new accounts arrive through third-party introducers, which the risk assessment " +
  "flags as the firm's largest onboarding exposure.";

function section(overrides: Partial<DraftSection> = {}): DraftSection {
  return {
    title: "Customer Due Diligence at onboarding",
    riskRating: "high",
    rationale: RATIONALE,
    requirementReference: "MAS Notice 626, para 6",
    sourceId: "S01",
    steps: [
      {
        procedure:
          "Obtain the customer risk-rating methodology and reperform the rating for 25 accounts " +
          "onboarded since January.",
        evidenceRequired: "Risk-rating methodology document and the onboarding file for each account.",
        sampling: "25 accounts, stratified across introducer and direct channels.",
      },
    ],
    ...overrides,
  };
}

function draft(sections: DraftSection[]): ProgrammeDraft {
  return {
    title: "AML/CFT Internal Audit Programme",
    scopeSummary: "Covers onboarding and monitoring; excludes sanctions screening technology.",
    sections,
  };
}

describe("normaliseProgramme", () => {
  it("publishes a well-formed section and resolves its source", () => {
    const result = normaliseProgramme(draft([section()]), sources);

    expect(result.rejections).toEqual([]);
    expect(result.sections).toHaveLength(1);

    // The URL comes from the catalogue, never from the model. Resolved through
    // the index rather than hardcoded, because which source holds which id
    // depends on the index's own ordering, not on this fixture's order.
    const cited = sources.resolve("S01")!;
    expect(result.sections[0]!.sourceUrl).toBe(cited.url);
    expect(result.sections[0]!.sourceName).toBe("FATF");
  });

  it("orders the riskiest areas first", () => {
    const result = normaliseProgramme(
      draft([
        section({ title: "Low area", riskRating: "low" }),
        section({ title: "High area", riskRating: "high" }),
        section({ title: "Medium area", riskRating: "medium" }),
      ]),
      sources,
    );

    expect(result.sections.map((entry) => entry.title)).toEqual([
      "High area",
      "Medium area",
      "Low area",
    ]);
  });

  it("never inflates an unrecognised risk rating", () => {
    for (const [raw, expected] of [
      ["High", "high"],
      ["critical", "high"],
      ["moderate", "medium"],
      ["", "medium"],
      ["nonsense", "medium"],
      ["Low", "low"],
    ] as const) {
      const result = normaliseProgramme(draft([section({ riskRating: raw })]), sources);
      expect(result.sections[0]!.riskRating, `rating "${raw}"`).toBe(expected);
    }
  });

  it("drops only the bad section, keeping the rest", () => {
    const result = normaliseProgramme(
      draft([
        section(),
        section({ title: "Cites nothing real", sourceId: "S99" }),
        section({ title: "Transaction monitoring", sourceId: "S02" }),
      ]),
      sources,
    );

    expect(result.sections).toHaveLength(2);
    expect(result.rejections[0]).toContain("unknown source");
  });

  it("rejects a section whose steps collect no evidence", () => {
    const result = normaliseProgramme(
      draft([
        section({
          steps: [{ procedure: "Review the AML framework thoroughly.", evidenceRequired: "  " }],
        }),
      ]),
      sources,
    );

    expect(result.sections).toHaveLength(0);
    expect(result.rejections[0]).toContain("no usable audit steps");
  });

  it("rejects a section that does not justify its own scope", () => {
    const result = normaliseProgramme(draft([section({ rationale: "It matters." })]), sources);

    expect(result.rejections[0]).toContain("why the area is in scope");
  });

  it("collapses a duplicated area", () => {
    const result = normaliseProgramme(draft([section(), section()]), sources);

    expect(result.sections).toHaveLength(1);
    expect(result.rejections[0]).toContain("duplicates an earlier section");
  });

  it("omits sampling guidance rather than inventing it", () => {
    const result = normaliseProgramme(
      draft([
        section({
          steps: [
            {
              procedure: "Obtain the board-approved AML policy and confirm the approval date.",
              evidenceRequired: "Signed board minutes recording approval.",
            },
          ],
        }),
      ]),
      sources,
    );

    expect(result.sections[0]!.steps[0]!.sampling).toBeUndefined();
  });
});
