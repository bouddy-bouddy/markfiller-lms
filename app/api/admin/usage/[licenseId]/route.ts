import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ADMIN_TOKEN_COOKIE, getAuthHeaderToken, verifyJwt } from "@/lib/auth";
import { getLicenseUsageStats } from "@/lib/usage";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

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
 * GET /api/admin/usage/[licenseId]
 * Get detailed usage statistics for a specific license
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ licenseId: string }> }
) {
  await connectToDatabase();

  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { licenseId } = await params;

    if (!mongoose.Types.ObjectId.isValid(licenseId)) {
      return NextResponse.json(
        { error: "Invalid license ID" },
        { status: 400 }
      );
    }

    const stats = await getLicenseUsageStats(
      new mongoose.Types.ObjectId(licenseId)
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching license usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch license usage" },
      { status: 500 }
    );
  }
}
