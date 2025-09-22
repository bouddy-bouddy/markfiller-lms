import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { EventLog } from "@/lib/models";
import { getAuthHeaderToken, verifyJwt } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await connectToDatabase();

  // Admin-only
  try {
    const token = getAuthHeaderToken(req.headers.get("authorization"));
    if (!token) throw new Error("Unauthorized");
    const payload = verifyJwt(token);
    if (payload.role !== "admin") throw new Error("Forbidden");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30); // last 30 days
  const events = await EventLog.find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(500);

  return NextResponse.json({ events });
}
