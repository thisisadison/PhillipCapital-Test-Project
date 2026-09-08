import { afterEach, describe, expect, it } from "vitest";
import {
  isAccessGateEnabled,
  isValidAccessCode,
  isValidAccessCookie,
  mintAccessToken,
} from "./token";

afterEach(() => {
  delete process.env.DIGEST_ACCESS_CODE;
});

describe("access gate", () => {
  it("is off when no code is configured", async () => {
    expect(isAccessGateEnabled()).toBe(false);
    expect(await isValidAccessCookie(undefined)).toBe(true);
  });

  it("is on once a code is configured", async () => {
    process.env.DIGEST_ACCESS_CODE = "monday-briefing";

    expect(isAccessGateEnabled()).toBe(true);
    expect(await isValidAccessCookie(undefined)).toBe(false);
  });

  it("accepts the configured code and rejects anything else", async () => {
    process.env.DIGEST_ACCESS_CODE = "monday-briefing";

    expect(await isValidAccessCode("monday-briefing")).toBe(true);
    expect(await isValidAccessCode("Monday-Briefing")).toBe(false);
    expect(await isValidAccessCode("monday-briefing ")).toBe(false);
    expect(await isValidAccessCode("")).toBe(false);
  });

  it("accepts a cookie minted from the configured code", async () => {
    process.env.DIGEST_ACCESS_CODE = "monday-briefing";

    expect(await isValidAccessCookie(await mintAccessToken("monday-briefing"))).toBe(true);
  });

  it("does not accept the raw code as a cookie value", async () => {
    process.env.DIGEST_ACCESS_CODE = "monday-briefing";

    expect(await isValidAccessCookie("monday-briefing")).toBe(false);
  });

  it("invalidates existing cookies when the code is rotated", async () => {
    process.env.DIGEST_ACCESS_CODE = "monday-briefing";
    const issued = await mintAccessToken("monday-briefing");

    process.env.DIGEST_ACCESS_CODE = "tuesday-briefing";
    expect(await isValidAccessCookie(issued)).toBe(false);
  });
});
