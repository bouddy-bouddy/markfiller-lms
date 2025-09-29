import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Activation, EventLog, License, Teacher } from "@/lib/models";
import { ADMIN_TOKEN_COOKIE, getAuthHeaderToken, verifyJwt } from "@/lib/auth";
import { nanoid } from "nanoid";
import { addMonths } from "date-fns";
import { licenseEmailTemplate, sendMail } from "@/lib/email";
import { calculateUploadLimit } from "@/lib/usage";

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
  const filter: Record<string, any> = {};
  if (q) {
    const regex = { $regex: q, $options: "i" } as const;
    // Try to find matching teachers by CIN, email, or name
    const teachers = await Teacher.find({
      $or: [{ cin: regex }, { email: regex }, { fullName: regex }],
    }).select("_id");
    const teacherIds = teachers.map((t) => t._id);

    filter.$or = [
      { key: regex },
      { status: regex },
      ...(teacherIds.length ? [{ teacher: { $in: teacherIds } }] : []),
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
    phone,
    level,
    subject,
    classesCount = 0,
    testsPerTerm = 0,
    allowedDevices = 1,
    monthsValid = 10,
  }: {
    fullName: string;
    email: string;
    cin?: string;
    phone?: string;
    level?: "الإعدادي" | "الثانوي";
    subject?: string;
    classesCount?: number;
    testsPerTerm?: number;
    allowedDevices?: number;
    monthsValid?: number;
  } = body;

  if (!fullName || !email) {
    return NextResponse.json(
      { error: "fullName and email are required" },
      { status: 400 }
    );
  }

  const key = `MF-${nanoid(6)}-${nanoid(6)}`.toUpperCase();
  const validUntil = addMonths(new Date(), monthsValid);

  // Calculate upload limit based on teacher's profile
  const uploadLimit = calculateUploadLimit(testsPerTerm, classesCount);

  // Find or create teacher
  let teacher = await Teacher.findOne({ email: email.toLowerCase() });

  if (!teacher) {
    // Create new teacher
    teacher = await Teacher.create({
      fullName,
      email: email.toLowerCase(),
      cin,
      phone,
      level,
      subject,
      classesCount,
      testsPerTerm,
    });
  } else {
    // Update existing teacher with new info if provided
    if (cin && !teacher.cin) teacher.cin = cin;
    if (phone && !teacher.phone) teacher.phone = phone;
    if (level && !teacher.level) teacher.level = level;
    if (subject && !teacher.subject) teacher.subject = subject;
    if (classesCount && !teacher.classesCount)
      teacher.classesCount = classesCount;
    if (testsPerTerm && !teacher.testsPerTerm)
      teacher.testsPerTerm = testsPerTerm;
    await teacher.save();
  }

  // Create license with upload tracking
  const license = await License.create({
    teacher: teacher._id,
    key,
    allowedDevices,
    validUntil,
    status: "active",
    uploadLimit,
    uploadCount: 0,
  });

  // Log creation
  await EventLog.create({
    license: license._id,
    teacher: teacher._id,
    type: "license.created",
    message: `License created with ${uploadLimit} upload limit (${testsPerTerm} tests/term × 2 × ${classesCount} classes + 10)`,
    metadata: {
      key,
      uploadLimit,
      classesCount,
      testsPerTerm,
    },
  });

  // Send email with license key
  try {
    const htmlContent = licenseEmailTemplate(
      teacher.fullName,
      key,
      validUntil.toLocaleDateString("ar-MA"),
      uploadLimit
    );

    await sendMail(
      teacher.email,
      "مفتاح ترخيص MarkFiller الخاص بك",
      htmlContent
    );
  } catch (emailError) {
    console.error("Failed to send license email:", emailError);
    // Don't fail the request if email fails
  }

  return NextResponse.json({
    success: true,
    license: {
      key,
      teacherName: teacher.fullName,
      teacherEmail: teacher.email,
      validUntil,
      uploadLimit,
      uploadCount: 0,
    },
  });
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
