import { describe, expect, it } from "vitest";
import {
  allAuditDomains,
  fallbackDimension,
  getAuditDomain,
  resolveDimensionId,
  resolveThemeId,
} from "./auditDomain";
import "./domains";

// These run against every registered domain rather than naming one, so adding
// an audit type inherits the whole contract instead of quietly skipping it.
describe.each(allAuditDomains().map((domain) => [domain.id, domain] as const))(
  "the %s domain",
  (_id, domain) => {
    it("has unique dimension ids", () => {
      const ids = domain.dimensions.map((dimension) => dimension.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("has unique option ids within each dimension", () => {
      for (const dimension of domain.dimensions) {
        const ids = dimension.options.map((option) => option.id);
        expect(new Set(ids).size, `${dimension.id} has duplicates`).toBe(ids.length);
      }
    });

    it("gives each risk dimension its own colour slot inside the validated palette", () => {
      const slots = domain.dimensions
        .map((dimension) => dimension.colorSlot)
        .filter((slot): slot is 1 | 2 | 3 | 4 | 5 => slot !== null);

      expect(new Set(slots).size).toBe(slots.length);
      expect(slots.every((slot) => slot >= 1 && slot <= 5)).toBe(true);
    });

    it("has exactly one colourless dimension, for unresolvable tags to fall back to", () => {
      const colourless = domain.dimensions.filter((dimension) => dimension.colorSlot === null);

      expect(colourless).toHaveLength(1);
      expect(fallbackDimension(domain).id).toBe(colourless[0]?.id);
    });

    it("makes the colourless control dimension optional and the framework's own required", () => {
      // The split matters: the required ones are what the regulator asks for, so
      // a blank one makes the assessment indefensible. Ours is a bonus.
      expect(fallbackDimension(domain).required).toBe(false);
      expect(domain.dimensions.some((dimension) => dimension.required)).toBe(true);
    });

    it("names the framework its dimensions come from", () => {
      expect(domain.frameworkNote.length).toBeGreaterThan(40);
    });

    it("has unique theme ids", () => {
      const ids = domain.themes.map((theme) => theme.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("names no paragraph numbers in its themes — those are retrieved, never recalled", () => {
      for (const theme of domain.themes) {
        expect(`${theme.label} ${theme.scope}`).not.toMatch(/paragraph\s+\d|\bpara\.?\s*\d/i);
      }
    });

    it("stays inside the API's allowed_domains cap", () => {
      expect(domain.sourceDomains.length).toBeLessThanOrEqual(64);
      expect(domain.sourceDomains.length).toBeGreaterThan(0);
    });

    it("names a title dimension that exists", () => {
      const ids = domain.dimensions.map((dimension) => dimension.id);
      expect(ids).toContain(domain.titleDimension);
    });

    it("resolves its own dimension ids and labels", () => {
      for (const dimension of domain.dimensions) {
        expect(resolveDimensionId(domain, dimension.id)).toBe(dimension.id);
        expect(resolveDimensionId(domain, dimension.label)).toBe(dimension.id);
        expect(resolveDimensionId(domain, dimension.label.toUpperCase())).toBe(dimension.id);
      }
    });

    it("resolves its own theme ids and labels", () => {
      for (const theme of domain.themes) {
        expect(resolveThemeId(domain, theme.id)).toBe(theme.id);
        expect(resolveThemeId(domain, theme.label)).toBe(theme.id);
      }
    });

    it("returns null for something unplaceable rather than guessing", () => {
      expect(resolveDimensionId(domain, "reputational")).toBeNull();
      expect(resolveDimensionId(domain, "")).toBeNull();
      expect(resolveThemeId(domain, "")).toBeNull();
    });
  },
);

describe("the registry", () => {
  it("keeps the domains distinct", () => {
    // Two domains sharing a dimension id would be fine; sharing an *identity*
    // would mean one silently overwrote the other at registration.
    const domains = allAuditDomains();
    expect(new Set(domains.map((domain) => domain.id)).size).toBe(domains.length);
  });

  it("gives AML and technology genuinely different dimensions", () => {
    // The point of the whole refactor: a technology auditor is not asked about
    // customer due diligence.
    const aml = getAuditDomain("aml").dimensions.map((d) => d.id);
    const tech = getAuditDomain("technology").dimensions.map((d) => d.id);
    const shared = aml.filter((id) => tech.includes(id));

    expect(shared).toEqual(["controls"]);
  });
});
