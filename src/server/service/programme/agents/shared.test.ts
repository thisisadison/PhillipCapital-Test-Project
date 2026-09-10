import { describe, expect, it } from "vitest";
import { clamp, collapse, hashId, label, normaliseRisk } from "./shared";

describe("normaliseRisk", () => {
  it("accepts the ratings as written", () => {
    expect(normaliseRisk("high")).toBe("high");
    expect(normaliseRisk("medium")).toBe("medium");
    expect(normaliseRisk("low")).toBe("low");
  });

  it("tolerates the casing and punctuation a model actually emits", () => {
    expect(normaliseRisk("  High ")).toBe("high");
    expect(normaliseRisk("LOW.")).toBe("low");
    expect(normaliseRisk("High risk")).toBe("high");
  });

  it("maps near-synonyms onto the scale", () => {
    expect(normaliseRisk("critical")).toBe("high");
    expect(normaliseRisk("severe")).toBe("high");
    expect(normaliseRisk("minor")).toBe("low");
  });

  it("falls back to medium for anything unrecognised", () => {
    // Structured outputs do not enforce enums, so this is a real path. Medium is
    // the honest default: guessing high would inflate a rating the model never
    // gave, and guessing low would bury one.
    expect(normaliseRisk("moderate-to-significant")).toBe("medium");
    expect(normaliseRisk("")).toBe("medium");
  });
});

describe("collapse", () => {
  it("flattens the whitespace a model wraps its prose in", () => {
    expect(collapse("  one\n  two\t three ")).toBe("one two three");
  });
});

describe("clamp", () => {
  it("leaves a string that already fits", () => {
    expect(clamp("short", 10)).toBe("short");
  });

  it("truncates with an ellipsis and never exceeds the limit", () => {
    const result = clamp("a".repeat(50), 10);

    expect(result).toHaveLength(10);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("hashId", () => {
  it("is stable for the same text, so re-running does not renumber everything", () => {
    expect(hashId("Beneficial ownership")).toBe(hashId("Beneficial ownership"));
  });

  it("separates different text", () => {
    expect(hashId("Beneficial ownership")).not.toBe(hashId("Transaction monitoring"));
  });
});

describe("label", () => {
  it("falls back rather than returning an empty string", () => {
    expect(label("   ")).toBe("untitled");
  });
});
