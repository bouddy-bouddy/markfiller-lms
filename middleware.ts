import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_TOKEN_COOKIE } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Handle CORS for API routes
  if (pathname.startsWith("/api/")) {
    // Handle preflight requests first
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With, Accept, Origin",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Get the response
    const response = NextResponse.next();

    // Add CORS headers to all API responses
    const origin = req.headers.get("origin");

    // Allow specific origins or all origins for development
    const allowedOrigins = [
      "https://localhost:3000",
      "http://localhost:3000",
      "https://your-production-domain.com", // Replace with your production domain
      "https://excel.officeapps.live.com",
      "https://outlook.officeapps.live.com",
    ];

    if (
      origin &&
      (allowedOrigins.includes(origin) ||
        origin.includes("officeapps.live.com") ||
        origin.includes("localhost"))
    ) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    } else {
      response.headers.set("Access-Control-Allow-Origin", "*");
    }

    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    );

    return response;
  }

  // Handle admin authentication (your existing logic)
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
  matcher: [
    "/admin/:path*", // Your existing admin routes
    "/api/:path*", // Added API routes for CORS handling
  ],
};
