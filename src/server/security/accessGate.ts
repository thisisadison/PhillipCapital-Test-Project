/**
 * Shared-code access gate.
 *
 * The digest contains only public market and industry information, so this is
 * deliberately the lightest thing that keeps a shared link from being wholly
 * public: one code the team knows, exchanged for a signed cookie. There are no
 * accounts, no roles and no per-user state, and there is nothing here worth
 * building any of that for.
 *
 * Runs on the Edge runtime (middleware), so it uses Web Crypto only.
 */

export const ACCESS_COOKIE = "pc_digest_access";
export const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Domain separator, so the cookie value is only ever valid for this purpose. */
const TOKEN_PAYLOAD = "pc-audit-digest-access-v1";

function accessCode(): string | null {
  return process.env.DIGEST_ACCESS_CODE?.trim() || null;
}

/** When no code is configured the gate is off — intended for local development. */
export function isAccessGateEnabled(): boolean {
  return accessCode() !== null;
}

/**
 * Derives the cookie value from the shared code. Changing `DIGEST_ACCESS_CODE`
 * invalidates every issued cookie, which is the whole revocation story.
 */
export async function mintAccessToken(code: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(code),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(TOKEN_PAYLOAD));
  return base64Url(new Uint8Array(signature));
}

/** True when `submitted` matches the configured code. */
export async function isValidAccessCode(submitted: string): Promise<boolean> {
  const expected = accessCode();
  if (!expected) return true;
  // HMAC rejects a zero-length key, so an empty submission must short-circuit
  // rather than reach `crypto.subtle` and throw.
  if (submitted.length === 0) return false;

  // Compare derived tokens rather than the codes themselves, so the comparison
  // is over fixed-length values regardless of what was submitted.
  return timingSafeEqual(await mintAccessToken(submitted), await mintAccessToken(expected));
}

export async function isValidAccessCookie(value: string | undefined): Promise<boolean> {
  const expected = accessCode();
  if (!expected) return true;
  if (!value) return false;

  return timingSafeEqual(value, await mintAccessToken(expected));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Constant-time for equal-length inputs; length differences are not secret here. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}
