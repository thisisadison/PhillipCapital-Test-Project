import { describe, expect, it } from "vitest";
import { deriveStats, deriveTrend } from "./digestStats";
import type { Digest, DigestEntry, DigestSummary } from "@/server/domain/digest";

function entry(overrides: Partial<DigestEntry> = {}): DigestEntry {
  return {
    id: Math.random().toString(16).slice(2, 14),
    category: "regulatory",
    headline: "A headline",
    synthesis: "A synthesis long enough to be worth carrying on the page.",
    actionRequired: "Do the thing.",
    impact: "watch",
    affects: [],
    sourceName: "MAS",
    sourceUrl: "https://www.mas.gov.sg/x",
    sourceType: "regulator",
    ...overrides,
  };
}

function digest(entries: DigestEntry[]): Digest {
  return {
    id: "2026-09-07",
    date: "2026-09-07",
    generatedAt: "2026-09-06T22:00:00.000Z",
    coversFrom: "2026-08-31",
    coversTo: "2026-09-07",
    summary: "A lede.",
    entries,
    meta: { trigger: "scheduled", model: "claude-opus-5", sourcesConsulted: 5, entriesRejected: 0 },
  };
}

describe("deriveStats", () => {
  it("counts every section, including the empty ones", () => {
    const stats = deriveStats(digest([entry(), entry({ category: "automation" })]));

    // All five are present so a colour never shifts between editions.
    expect(stats.byCategory).toHaveLength(5);
    expect(stats.byCategory.find((datum) => datum.id === "regulatory")?.count).toBe(1);
    expect(stats.byCategory.find((datum) => datum.id === "resilience")?.count).toBe(0);
  });

  it("lists only the source types actually present", () => {
    const stats = deriveStats(
      digest([entry(), entry({ sourceType: "press", sourceName: "Reuters" })]),
    );

    expect(stats.bySourceType.map((datum) => datum.type)).toEqual(["regulator", "press"]);
  });

  it("computes the primary-source share as a whole percentage", () => {
    const stats = deriveStats(
      digest([
        entry({ sourceType: "regulator" }),
        entry({ sourceType: "profession" }),
        entry({ sourceType: "press" }),
        entry({ sourceType: "vendor" }),
      ]),
    );

    expect(stats.primarySharePercent).toBe(50);
  });

  it("counts what needs action now", () => {
    const stats = deriveStats(
      digest([entry({ impact: "act-now" }), entry({ impact: "plan-for" }), entry()]),
    );

    expect(stats.actNow).toBe(1);
    expect(stats.total).toBe(3);
  });

  it("does not divide by zero on an edition with no entries", () => {
    const stats = deriveStats(digest([]));

    expect(stats.primarySharePercent).toBe(0);
    expect(stats.total).toBe(0);
  });
});

describe("deriveTrend", () => {
  const summary = (date: string, entryCount: number): DigestSummary => ({
    date,
    generatedAt: `${date}T00:00:00.000Z`,
    summary: "",
    entryCount,
    countsByCategory: {},
  });

  it("returns points oldest first", () => {
    const trend = deriveTrend([summary("2026-09-07", 9), summary("2026-08-31", 6)]);

    expect(trend.map((point) => point.date)).toEqual(["2026-08-31", "2026-09-07"]);
  });

  it("refuses to draw a trend through a single edition", () => {
    expect(deriveTrend([summary("2026-09-07", 9)])).toEqual([]);
    expect(deriveTrend([])).toEqual([]);
  });
});
