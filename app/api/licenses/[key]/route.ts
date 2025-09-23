import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Activation, EventLog, License, Teacher } from "@/lib/models";
import { ADMIN_TOKEN_COOKIE, getAuthHeaderToken, verifyJwt } from "@/lib/auth";
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

export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = decodeURIComponent(params.key);
  const license = await License.findOne({ key }).populate("teacher");
  if (!license)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activations = await Activation.find({ license: license._id })
    .sort({ activatedAt: 1 })
    .lean();

  const logs = await EventLog.find({ license: license._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({ license, activations, logs });
}
