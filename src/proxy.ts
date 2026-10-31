import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/server/auth.config";

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`; the named export must be `proxy`.
 *
 * This performs an *optimistic* check only: it bounces anonymous visitors to the login screen so
 * they never see a protected shell (EF-05). Real authorization — role checks and dormitory
 * scoping — happens in `src/server/guards.ts`, because the Next.js documentation is explicit that
 * proxy should not be used as a session-management or authorization boundary.
 */
const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = ["/login", "/forgot-password"];

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth?.user);
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  if (!isLoggedIn && !isPublicRoute) {
    // REST clients get a JSON 401, not a redirect to an HTML login page. The endpoints' own
    // guards would return this anyway; answering here keeps the response shape consistent
    // whether the proxy or the handler rejects the call.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "Nuk jeni i identifikuar." },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", request.nextUrl);
    // Preserve the destination so a QR scan by a logged-out student resumes after login.
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Skip Next internals, the auth endpoints themselves, and static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|uploads|favicon.ico|.*\\.png$).*)"],
};
