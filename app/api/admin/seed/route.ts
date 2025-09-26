import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { AdminUser } from "@/lib/models";

export async function POST() {
  await connectToDatabase();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return NextResponse.json(
      { error: "ADMIN_EMAIL and ADMIN_PASSWORD are required" },
      { status: 400 }
    );
  }

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { message: "Admin already exists" },
      { status: 200 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await AdminUser.create({ email, passwordHash });
  return NextResponse.json({ message: "Admin seeded" }, { status: 201 });
}
