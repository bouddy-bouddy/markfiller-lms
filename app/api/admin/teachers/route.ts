import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ADMIN_TOKEN_COOKIE, getAuthHeaderToken, verifyJwt } from "@/lib/auth";
import { License, Teacher } from "@/lib/models";

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

export async function GET(req: NextRequest) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q");

  const filter: any = {};
  if (q) {
    const re = new RegExp(q, "i");
    filter.$or = [{ fullName: re }, { email: re }, { cin: re }];
  }

  const teachers = await Teacher.find(filter)
    .select("_id fullName email cin createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  // Count licenses per teacher
  const teacherIds = teachers.map((t) => t._id);
  const counts = await License.aggregate([
    { $match: { teacher: { $in: teacherIds } } },
    { $group: { _id: "$teacher", count: { $sum: 1 } } },
  ]);
  const idToCount = new Map<string, number>();
  counts.forEach((c: any) => idToCount.set(String(c._id), c.count));

  const result = teachers.map((t) => ({
    ...t,
    licenses: idToCount.get(String(t._id)) || 0,
  }));

  return NextResponse.json(result);
}
