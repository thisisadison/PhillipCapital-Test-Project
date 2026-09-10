import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderSkillReferences } from "./skillReferences";
import { allAuditDomains } from "./auditDomain";
import "./domains";

const REFERENCE_DIR = join(process.cwd(), ".claude/skills/audit-programme/references");

const rendered = renderSkillReferences();

describe("the checked-in skill references", () => {
  // The app and the Cowork skill are two surfaces on one domain. If these
  // drift, an auditor running the skill is asked about a dimension the app no
  // longer has — the kind of rot nobody notices until it matters. Regenerate
  // with `npm run skill:refs`.
  for (const [name, expected] of Object.entries(rendered)) {
    it(`${name} is up to date with the domain modules`, async () => {
      const onDisk = await readFile(join(REFERENCE_DIR, name), "utf8");
      expect(onDisk).toBe(expected);
    });
  }
});

describe("audit-types.md", () => {
  const body = rendered["audit-types.md"] ?? "";

  it("lists every registered audit type", () => {
    for (const domain of allAuditDomains()) expect(body).toContain(domain.label);
  });

  it("tells the model to settle the type before anything else", () => {
    expect(body).toMatch(/before anything else/i);
  });

  it("tells it to say so when the audit type is not covered", () => {
    // The failure mode this guards against is the skill confidently scoping an
    // operations audit as though it had a framework behind it.
    expect(body).toMatch(/not listed/i);
  });
});

describe.each(allAuditDomains().map((domain) => [domain.id, domain] as const))(
  "the %s references",
  (id, domain) => {
    const dimensions = rendered[`${id}/risk-dimensions.md`] ?? "";
    const themes = rendered[`${id}/obligation-themes.md`] ?? "";
    const sources = rendered[`${id}/source-policy.md`] ?? "";

    it("offers every option the app offers, in the auditor's own words", () => {
      for (const dimension of domain.dimensions) {
        expect(dimensions).toContain(dimension.label);
        for (const option of dimension.options) expect(dimensions).toContain(option.label);
      }
    });

    it("marks exactly one dimension optional — the framework's own are required", () => {
      const optional = dimensions.match(/^## .*\(optional\)$/gm) ?? [];
      expect(optional).toHaveLength(1);
    });

    it("names the framework the dimensions come from", () => {
      expect(dimensions).toContain(domain.frameworkNote);
    });

    it("lists every theme and tells the model to report the gaps", () => {
      for (const theme of domain.themes) expect(themes).toContain(theme.label);
      expect(themes).toMatch(/gap/i);
    });

    it("names no paragraph numbers — those are retrieved, never recalled", () => {
      expect(themes).not.toMatch(/paragraph\s+\d/i);
    });

    it("lists the domain's own source hosts and no others", () => {
      for (const host of domain.sourceDomains) expect(sources).toContain(host);
      // Trade press is excluded from every programme allowlist; if one leaked
      // in, an auditor could end up testing against a magazine article.
      expect(sources).not.toContain("accountingtoday.com");
      expect(sources).not.toContain("complianceweek.com");
    });

    it("distinguishes binding obligation from guidance", () => {
      expect(sources).toMatch(/guidance/i);
    });
  },
);

describe("the domains' references are actually different", () => {
  // Spot checks with a specific failure in mind: a domain quietly inheriting
  // another's vocabulary, which would make the skill ask an auditor questions
  // from the wrong audit.
  it("does not ask a technology auditor about customer due diligence", () => {
    const tech = rendered["technology/risk-dimensions.md"] ?? "";

    expect(tech).not.toMatch(/politically exposed/i);
    expect(tech).not.toMatch(/beneficial ownership/i);
    expect(tech).toMatch(/privileged/i);
  });

  it("does not ask an AML auditor about patch management", () => {
    const aml = rendered["aml/risk-dimensions.md"] ?? "";

    expect(aml).not.toMatch(/patch/i);
    expect(aml).toMatch(/politically exposed/i);
  });

  it("asks the client asset auditor about custody and reconciliation", () => {
    const assets = rendered["client-assets/risk-dimensions.md"] ?? "";

    expect(assets).toMatch(/trust/i);
    expect(assets).toMatch(/reconcil/i);
    expect(assets).not.toMatch(/suitability/i);
  });

  it("asks the conduct auditor about suitability and licensing", () => {
    const conduct = rendered["conduct/risk-dimensions.md"] ?? "";

    expect(conduct).toMatch(/representative/i);
    expect(conduct).toMatch(/execution/i);
    expect(conduct).not.toMatch(/reconciliation/i);
  });
});
