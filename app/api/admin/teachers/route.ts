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

export async function PATCH(req: NextRequest) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    id,
    fullName,
    email,
    cin,
  }: {
    id: string;
    fullName?: string;
    email?: string;
    cin?: string;
  } = await req.json();

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const update: Record<string, any> = {};
  if (typeof fullName === "string") update.fullName = fullName;
  if (email) {
    const exists = await Teacher.findOne({
      email: String(email).toLowerCase(),
      _id: { $ne: id },
    });
    if (exists)
      return NextResponse.json(
        { error: "Email already in use by another teacher" },
        { status: 409 }
      );
    update.email = String(email).toLowerCase();
  }
  if (cin) {
    const exists = await Teacher.findOne({
      cin,
      _id: { $ne: id },
    });
    if (exists)
      return NextResponse.json(
        { error: "CIN already in use by another teacher" },
        { status: 409 }
      );
    update.cin = cin;
  }

  const teacher = await Teacher.findByIdAndUpdate(id, update, {
    new: true,
  }).select("_id fullName email cin createdAt");

  if (!teacher)
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  return NextResponse.json(teacher);
}

export async function DELETE(req: NextRequest) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Check if teacher has any licenses
  const licenseCount = await License.countDocuments({ teacher: id });
  if (licenseCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete teacher with ${licenseCount} active license(s). Please delete the licenses first.`,
      },
      { status: 409 }
    );
  }

  const result = await Teacher.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
