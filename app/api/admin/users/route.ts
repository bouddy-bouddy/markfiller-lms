import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { AdminUser } from "@/lib/models";
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

export async function GET(req: NextRequest) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = new URL(req.url).searchParams.get("q");
  const filter: any = {};
  if (q) {
    const re = new RegExp(q, "i");
    filter.$or = [{ email: re }, { fullName: re }];
  }
  const users = await AdminUser.find(filter)
    .select("_id fullName email role createdAt")
    .sort({ createdAt: -1 })
    .limit(200);
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const {
    fullName,
    email,
    password,
    role,
  }: {
    fullName?: string;
    email: string;
    password: string;
    role?: "admin" | "support";
  } = await req.json();
  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password required" },
      { status: 400 }
    );
  }
  const exists = await AdminUser.findOne({
    email: String(email).toLowerCase(),
  });
  if (exists)
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await AdminUser.create({
    fullName,
    email: String(email).toLowerCase(),
    passwordHash,
    role: role || "admin",
  });
  return NextResponse.json(
    {
      _id: user._id,
      fullName: user.fullName || "",
      email: user.email,
      role: (user as any).role || "admin",
      createdAt: user.createdAt,
    },
    { status: 201 }
  );
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
    password,
    role,
    email,
  }: {
    id: string;
    fullName?: string;
    password?: string;
    role?: "admin" | "support";
    email?: string;
  } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const update: Record<string, any> = {};
  if (typeof fullName === "string") update.fullName = fullName;
  if (role) update.role = role;
  if (email) {
    const exists = await AdminUser.findOne({
      email: String(email).toLowerCase(),
      _id: { $ne: id },
    });
    if (exists)
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    update.email = String(email).toLowerCase();
  }
  if (password) update.passwordHash = await bcrypt.hash(password, 10);
  const user = await AdminUser.findByIdAndUpdate(id, update, {
    new: true,
  }).select("_id fullName email role createdAt");
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
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
  await AdminUser.deleteOne({ _id: id });
  return NextResponse.json({ deleted: true });
}
