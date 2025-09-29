import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ADMIN_TOKEN_COOKIE, getAuthHeaderToken, verifyJwt } from "@/lib/auth";
import { getAllUsageStats } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireAdmin(req: NextRequest) {
  const tokenFromHeader = getAuthHeaderToken(req.headers.get("authorization"));
  const tokenFromCookie = req.cookies.get(ADMIN_TOKEN_COOKIE)?.value || null;
  const token = tokenFromHeader || tokenFromCookie;
  if (!token) throw new Error("Unauthorized");
  const payload = verifyJwt(token);
  if (payload.role !== "admin") throw new Error("Forbidden");
  return payload;
}

/**
 * GET /api/admin/usage
 * Get usage statistics for all licenses (Admin Dashboard)
 */
export async function GET(req: NextRequest) {
  await connectToDatabase();

  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getAllUsageStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage statistics" },
      { status: 500 }
    );
  }
}
