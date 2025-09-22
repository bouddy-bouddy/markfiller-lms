import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { AdminUser } from "@/lib/models";
import { ADMIN_TOKEN_COOKIE, signAdminJwt } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const admin = await AdminUser.findOne({ email: String(email).toLowerCase() });
  if (!admin) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signAdminJwt({
    sub: String(admin._id),
    email: admin.email,
    role: "admin",
  });
  const res = NextResponse.json({ token });
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set(ADMIN_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
  return res;
}
