import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, isAccessGateEnabled, isValidAccessCookie } from "@/server/security/accessGate";

/**
 * The access gate, applied before any route renders.
 *
 * Next 16 calls this file convention `proxy`; it is the former `middleware`.
 */

/** Paths that must stay reachable without a cookie. */
const PUBLIC_PATHS = new Set(["/unlock", "/api/access"]);

/** The scheduler authenticates with its own bearer secret, not the shared code. */
const SELF_AUTHENTICATED_PREFIXES = ["/api/cron"];

export default async function proxy(request: NextRequest) {
  if (!isAccessGateEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (
    PUBLIC_PATHS.has(pathname) ||
    SELF_AUTHENTICATED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  if (await isValidAccessCookie(request.cookies.get(ACCESS_COOKIE)?.value)) {
    return NextResponse.next();
  }

  // API callers get a status code; people get the unlock page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Access code required." }, { status: 401 });
  }

  const unlockUrl = new URL("/unlock", request.url);
  const target = `${pathname}${request.nextUrl.search}`;
  if (target !== "/") unlockUrl.searchParams.set("next", target);

  return NextResponse.redirect(unlockUrl);
}

export const config = {
  // Everything except Next's own assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
