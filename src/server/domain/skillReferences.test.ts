import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderSkillReferences } from "./skillReferences";
import { INTAKE_QUESTIONS } from "./riskIntake";
import { OBLIGATION_THEMES } from "./masFramework";

const REFERENCE_DIR = join(process.cwd(), ".claude/skills/aml-audit-programme/references");

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

describe("risk-dimensions.md", () => {
  const body = rendered["risk-dimensions.md"] ?? "";

  it("offers every option the app offers, in the auditor's own words", () => {
    for (const question of INTAKE_QUESTIONS) {
      expect(body).toContain(question.label);
      for (const option of question.options) expect(body).toContain(option.label);
    }
  });

  it("marks the optional dimension and leaves MAS's four unmarked", () => {
    const optional = body.match(/^## .*\(optional\)$/gm) ?? [];
    expect(optional).toHaveLength(1);
    expect(optional[0]).toContain("Known control weaknesses");
  });
});

describe("obligation-themes.md", () => {
  const body = rendered["obligation-themes.md"] ?? "";

  it("lists every theme", () => {
    for (const theme of OBLIGATION_THEMES) expect(body).toContain(theme.label);
  });

  it("tells the model to report the themes it missed", () => {
    expect(body).toMatch(/gap/i);
  });

  it("names no paragraph numbers — those are retrieved, never recalled", () => {
    expect(body).not.toMatch(/paragraph\s+\d/i);
  });
});

describe("source-policy.md", () => {
  const body = rendered["source-policy.md"] ?? "";

  it("lists the primary bodies an audit programme may cite", () => {
    expect(body).toContain("mas.gov.sg");
    expect(body).toContain("fatf-gafi.org");
  });

  it("excludes trade press, which the app's programme allowlist also excludes", () => {
    expect(body).not.toContain("accountingtoday.com");
    expect(body).not.toContain("complianceweek.com");
  });
});
