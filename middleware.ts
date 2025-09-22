import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // In middleware (Edge runtime), avoid heavy JWT verification.
  // Presence of cookie is enough; API routes will verify JWT server-side.
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
