import { describe, expect, it } from "vitest";
import { EXAMPLE_PROFILES } from "./exampleProfiles";
import { allAuditDomains, getAuditDomain } from "./auditDomain";
import "./domains";
import { sanitiseIntake } from "./riskIntake";

describe("example profiles", () => {
  for (const domain of allAuditDomains()) {
    describe(domain.id, () => {
      const profile = EXAMPLE_PROFILES[domain.id];

      it("references only options that still exist", () => {
        // A renamed option id would otherwise leave the example button
        // silently ticking nothing, which reads as a broken button.
        for (const [dimensionId, ids] of Object.entries(profile)) {
          const dimension = getAuditDomain(domain.id).dimensions.find((d) => d.id === dimensionId);
          expect(dimension, `unknown dimension ${dimensionId}`).toBeDefined();

          const known = new Set(dimension?.options.map((option) => option.id));
          for (const id of ids) expect(known.has(id), `unknown option ${id}`).toBe(true);
        }
      });

      it("answers every required dimension, so the example can actually be submitted", () => {
        const { problems } = sanitiseIntake({ domain: domain.id, selections: profile });
        expect(problems).toEqual([]);
      });

      it("spans enough dimensions to give the scope agent a real merge", () => {
        const answered = Object.values(profile).filter((ids) => ids.length > 0).length;
        expect(answered).toBeGreaterThanOrEqual(domain.dimensions.length - 1);
      });
    });
  }
});
