import { describe, expect, it } from "vitest";
import { monogramFor } from "./monogram";

describe("monogramFor", () => {
  it("keeps a short acronym whole rather than truncating it", () => {
    // "MAS" cut to "MA" reads as a rendering bug, not a logo.
    expect(monogramFor("MAS")).toBe("MAS");
    expect(monogramFor("EY")).toBe("EY");
    expect(monogramFor("FATF")).toBe("FA");
  });

  it("drops a leading article", () => {
    expect(monogramFor("The IIA")).toBe("IIA");
  });

  it("uses initials for a real name", () => {
    expect(monogramFor("Journal of Accountancy")).toBe("JO");
    expect(monogramFor("CSA Singapore")).toBe("CS");
    expect(monogramFor("Deloitte")).toBe("DE");
  });

  it("never returns an empty mark", () => {
    expect(monogramFor("   ")).toBe("?");
    expect(monogramFor("")).toBe("?");
  });
});
