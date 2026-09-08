import { describe, expect, it } from "vitest";
import { groundEntries, normalizeUrl } from "./grounding";
import type { RetrievedSource } from "./research";
import type { DigestEntryDraft } from "./schema";

function source(url: string): RetrievedSource {
  return { url, title: "A source", pageAge: null };
}

function draft(overrides: Partial<DigestEntryDraft> = {}): DigestEntryDraft {
  return {
    category: "regulatory",
    headline: "MAS sets a deadline for board-level AI oversight",
    synthesis:
      "MAS published an information paper giving banks until 30 June to evidence board oversight " +
      "of AI systems in production. Audit functions will need to test that the reporting line " +
      "actually exists rather than that a policy mentions it.",
    sourceName: "MAS",
    sourceUrl: "https://www.mas.gov.sg/publications/ai-oversight",
    ...overrides,
  };
}

describe("normalizeUrl", () => {
  it("treats casing, www and trailing slashes as the same page", () => {
    expect(normalizeUrl("https://WWW.MAS.gov.sg/publications/x/")).toBe(
      normalizeUrl("https://mas.gov.sg/publications/x"),
    );
  });

  it("ignores campaign parameters but keeps meaningful query strings", () => {
    expect(normalizeUrl("https://a.com/p?utm_source=x&id=7")).toBe(normalizeUrl("https://a.com/p?id=7"));
    expect(normalizeUrl("https://a.com/p?id=7")).not.toBe(normalizeUrl("https://a.com/p?id=8"));
  });

  it("does not throw on a value that is not a URL", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });
});

describe("groundEntries", () => {
  it("keeps an entry whose URL was retrieved", () => {
    const result = groundEntries(
      [draft()],
      [source("https://www.mas.gov.sg/publications/ai-oversight")],
    );

    expect(result.entries).toHaveLength(1);
    expect(result.dropped).toBe(0);
    expect(result.entries[0]!.id).toMatch(/^[0-9a-f]{12}$/);
  });

  it("drops an entry citing a URL that was never retrieved", () => {
    const result = groundEntries(
      [draft({ sourceUrl: "https://www.mas.gov.sg/invented-page" })],
      [source("https://www.mas.gov.sg/publications/ai-oversight")],
    );

    expect(result.entries).toHaveLength(0);
    expect(result.dropped).toBe(1);
    expect(result.warnings[0]).toContain("not in any search result");
  });

  it("matches a retrieved URL through cosmetic differences", () => {
    const result = groundEntries(
      [draft({ sourceUrl: "http://mas.gov.sg/publications/ai-oversight/#summary" })],
      [source("https://www.mas.gov.sg/publications/ai-oversight")],
    );

    expect(result.dropped).toBe(0);
    // The published link is the canonical one the search tool returned, not the
    // variant the model happened to write.
    expect(result.entries[0]!.sourceUrl).toBe("https://www.mas.gov.sg/publications/ai-oversight");
  });

  it("collapses the same source appearing in two categories", () => {
    const result = groundEntries(
      [draft(), draft({ category: "ai-governance" })],
      [source("https://www.mas.gov.sg/publications/ai-oversight")],
    );

    expect(result.entries).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.includes("duplicate"))).toBe(true);
  });

  it("gives the same source a stable id across runs", () => {
    const retrieved = [source("https://www.mas.gov.sg/publications/ai-oversight")];
    const first = groundEntries([draft()], retrieved);
    const second = groundEntries([draft({ headline: "A totally different headline here" })], retrieved);

    expect(first.entries[0]!.id).toBe(second.entries[0]!.id);
  });
});
