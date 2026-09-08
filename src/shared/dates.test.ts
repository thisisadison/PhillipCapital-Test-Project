import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatEditionDate, formatShortDate, toDateKey } from "./dates";

describe("date helpers", () => {
  it("resolves the date key in the team's timezone, not the server's", () => {
    // 23:30 UTC on 7 Sep is already 07:30 on 8 Sep in Singapore. A server in
    // UTC must still date the edition the way the team reads it.
    const instant = new Date("2026-09-07T23:30:00.000Z");

    expect(toDateKey(instant, "Asia/Singapore")).toBe("2026-09-08");
    expect(toDateKey(instant, "UTC")).toBe("2026-09-07");
  });

  it("shifts date keys across month and year boundaries", () => {
    expect(addDays("2026-09-08", -7)).toBe("2026-09-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("measures whole days between keys", () => {
    expect(daysBetween("2026-09-01", "2026-09-08")).toBe(7);
    expect(daysBetween("2026-09-08", "2026-09-01")).toBe(-7);
    expect(daysBetween("2026-09-08", "2026-09-08")).toBe(0);
  });

  it("formats dates without shifting them into another day", () => {
    expect(formatEditionDate("2026-09-08")).toBe("8 September 2026");
    // en-GB abbreviates September as "Sept"; the point of the assertion is the
    // day number, which must not drift across a timezone boundary.
    expect(formatShortDate("2026-09-08")).toBe("8 Sept");
    expect(formatShortDate("2026-01-01")).toBe("1 Jan");
  });

  it("rejects a malformed date key rather than inventing a date", () => {
    expect(() => addDays("not-a-date", 1)).toThrow();
  });
});
