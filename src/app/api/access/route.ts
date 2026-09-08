import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  isAccessGateEnabled,
  isValidAccessCode,
  mintAccessToken,
} from "@/lib/access/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exchanges the shared access code for the signed cookie the middleware checks. */
export async function POST(request: Request) {
  if (!isAccessGateEnabled()) {
    return NextResponse.json({ ok: true });
  }

  let code: unknown;
  try {
    ({ code } = await request.json());
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (typeof code !== "string" || code.length === 0 || code.length > 200) {
    return NextResponse.json({ error: "Enter the access code." }, { status: 400 });
  }

  if (!(await isValidAccessCode(code))) {
    // Deliberately vague: the only useful signal is right or wrong.
    return NextResponse.json({ error: "That access code is not recognised." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, await mintAccessToken(code), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
