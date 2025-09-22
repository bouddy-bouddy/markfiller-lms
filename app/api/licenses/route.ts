import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Activation, EventLog, License, Teacher } from "@/lib/models";
import { ADMIN_TOKEN_COOKIE, getAuthHeaderToken, verifyJwt } from "@/lib/auth";
import { nanoid } from "nanoid";
import { addMonths } from "date-fns";
import { licenseEmailTemplate, sendMail } from "@/lib/email";

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
  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { key: { $regex: q, $options: "i" } },
      { status: { $regex: q, $options: "i" } },
    ];
  }
  const licenses = await License.find(filter)
    .populate("teacher")
    .sort({ createdAt: -1 })
    .limit(200);
  return NextResponse.json(licenses);
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    fullName,
    email,
    cin,
    allowedDevices = 1,
    monthsValid = 10,
  }: {
    fullName: string;
    email: string;
    cin: string;
    allowedDevices?: number;
    monthsValid?: number;
  } = body;

  if (!fullName || !email || !cin) {
    return NextResponse.json(
      { error: "fullName, email and cin are required" },
      { status: 400 }
    );
  }

  const key = `MF-${nanoid(6)}-${nanoid(6)}`.toUpperCase();
  const validUntil = addMonths(new Date(), monthsValid);

  const teacher = await Teacher.findOneAndUpdate(
    { email: String(email).toLowerCase() },
    { fullName, email: String(email).toLowerCase(), cin },
    { upsert: true, new: true }
  );

  const license = await License.create({
    teacher: teacher._id,
    key,
    allowedDevices,
    validUntil,
    status: "active",
  });

  await EventLog.create({
    teacher: teacher._id,
    license: license._id,
    type: "license.created",
    message: `License created for ${email}`,
    metadata: { allowedDevices, monthsValid },
  });

  try {
    await sendMail(
      email,
      "MarkFiller License Key",
      licenseEmailTemplate(fullName, key)
    );
  } catch (e) {
    await EventLog.create({
      license: license._id,
      teacher: teacher._id,
      type: "validation.failed",
      message: "Email sending failed",
      metadata: { error: (e as Error).message },
    });
  }

  return NextResponse.json(license, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key, status }: { key: string; status: "active" | "suspended" } =
    await req.json();
  if (!key || !status)
    return NextResponse.json(
      { error: "key and status required" },
      { status: 400 }
    );

  const license = await License.findOneAndUpdate(
    { key },
    { status },
    { new: true }
  );
  if (!license)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status === "suspended") {
    await EventLog.create({
      license: license._id,
      type: "license.suspended",
      message: "License suspended",
    });
  }
  if (status === "active") {
    await EventLog.create({
      license: license._id,
      type: "validation.ok",
      message: "License re-activated",
    });
  }

  return NextResponse.json(license);
}

export async function DELETE(req: NextRequest) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const id = url.searchParams.get("id");
  if (!key && !id) {
    return NextResponse.json({ error: "Provide key or id" }, { status: 400 });
  }

  const license = await License.findOne(key ? { key } : { _id: id });
  if (!license)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Activation.deleteMany({ license: license._id });
  await EventLog.deleteMany({ license: license._id });
  await License.deleteOne({ _id: license._id });

  return NextResponse.json({ deleted: true });
}
