import { describe, expect, it } from "vitest";
import { OBLIGATION_THEMES, formatThemes, getObligationTheme, resolveThemeId } from "./masFramework";

describe("the theme catalogue", () => {
  it("covers the obligations an AML audit is expected to reach", () => {
    const ids = OBLIGATION_THEMES.map((theme) => theme.id);

    // Not an exhaustive list of the Notice, but the themes an auditor would
    // notice the absence of. A gap here shows up as a coverage gap on the page.
    expect(ids).toContain("cdd");
    expect(ids).toContain("beneficial-ownership");
    expect(ids).toContain("sanctions-screening");
    expect(ids).toContain("str");
    expect(ids).toContain("ongoing-monitoring");
  });

  it("has unique ids", () => {
    const ids = OBLIGATION_THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names no paragraph numbers — those are retrieved from the instrument at run time", () => {
    // Hard-coding a citation is how a tool ends up quoting a notice that has
    // since been reissued.
    for (const theme of OBLIGATION_THEMES) {
      expect(`${theme.label} ${theme.scope}`).not.toMatch(/paragraph\s+\d|\bpara\.?\s*\d/i);
    }
  });
});

describe("resolveThemeId", () => {
  it("accepts the ids as written", () => {
    expect(resolveThemeId("cdd")).toBe("cdd");
    expect(resolveThemeId("beneficial-ownership")).toBe("beneficial-ownership");
  });

  it("accepts labels and the casing a model actually emits", () => {
    expect(resolveThemeId("Customer due diligence")).toBe("cdd");
    expect(resolveThemeId("  SANCTIONS AND NAME SCREENING ")).toBe("sanctions-screening");
    expect(resolveThemeId("beneficial_ownership")).toBe("beneficial-ownership");
  });

  it("prefers an exact id over a longer label that contains it", () => {
    expect(resolveThemeId("str")).toBe("str");
  });

  it("returns null for anything unrecognised", () => {
    // Null is a legitimate outcome: the obligation is still kept and shown
    // untagged, because the citation is the part that matters.
    expect(resolveThemeId("market abuse")).toBeNull();
    expect(resolveThemeId("")).toBeNull();
  });
});

describe("getObligationTheme", () => {
  it("returns the theme for a known id", () => {
    expect(getObligationTheme("peps")?.label).toBe("Politically exposed persons");
  });
});

describe("formatThemes", () => {
  it("lists every theme with its id, for the agent brief", () => {
    const formatted = formatThemes();

    for (const theme of OBLIGATION_THEMES) {
      expect(formatted).toContain(`\`${theme.id}\``);
      expect(formatted).toContain(theme.label);
    }
  });
});
