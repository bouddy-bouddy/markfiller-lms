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
  { params }: { params: Promise<{ key: string }> }
) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key: keyParam } = await params;
  const key = decodeURIComponent(keyParam);
  const license = await License.findOne({ key }).populate({
    path: "teacher",
    select:
      "fullName email cin phone level subject classesCount testsPerTerm createdAt",
  });
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key: keyParam } = await params;
  const key = decodeURIComponent(keyParam);

  const body = await req.json();
  const { teacher, allowedDevices, status, validUntil } = body;

  const license = await License.findOne({ key });
  if (!license) {
    return NextResponse.json({ error: "License not found" }, { status: 404 });
  }

  try {
    // Update license fields
    const updateData: any = {};
    if (allowedDevices !== undefined)
      updateData.allowedDevices = allowedDevices;
    if (status !== undefined) updateData.status = status;
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);

    if (Object.keys(updateData).length > 0) {
      await License.findByIdAndUpdate(license._id, updateData);
    }

    // Update teacher information if provided
    if (teacher && license.teacher) {
      const teacherUpdateData: any = {};
      if (teacher.fullName !== undefined)
        teacherUpdateData.fullName = teacher.fullName;
      if (teacher.email !== undefined)
        teacherUpdateData.email = teacher.email.toLowerCase();
      if (teacher.cin !== undefined) teacherUpdateData.cin = teacher.cin;
      if (teacher.phone !== undefined) teacherUpdateData.phone = teacher.phone;
      if (teacher.level !== undefined) teacherUpdateData.level = teacher.level;
      if (teacher.subject !== undefined)
        teacherUpdateData.subject = teacher.subject;
      if (teacher.classesCount !== undefined)
        teacherUpdateData.classesCount = teacher.classesCount;
      if (teacher.testsPerTerm !== undefined)
        teacherUpdateData.testsPerTerm = teacher.testsPerTerm;

      // Check for email/CIN conflicts if they're being updated
      if (teacher.email !== undefined || teacher.cin !== undefined) {
        const existingTeacher = await Teacher.findOne({
          _id: { $ne: license.teacher },
          $or: [
            ...(teacher.email ? [{ email: teacher.email.toLowerCase() }] : []),
            ...(teacher.cin ? [{ cin: teacher.cin }] : []),
          ],
        });

        if (existingTeacher) {
          if (
            teacher.email &&
            existingTeacher.email === teacher.email.toLowerCase()
          ) {
            return NextResponse.json(
              { error: "Email already in use by another teacher" },
              { status: 409 }
            );
          }
          if (teacher.cin && existingTeacher.cin === teacher.cin) {
            return NextResponse.json(
              { error: "CIN already in use by another teacher" },
              { status: 409 }
            );
          }
        }
      }

      if (Object.keys(teacherUpdateData).length > 0) {
        await Teacher.findByIdAndUpdate(license.teacher, teacherUpdateData);
      }
    }

    // Log the update
    await EventLog.create({
      license: license._id,
      teacher: license.teacher,
      type: "license.updated",
      message: "License information updated",
      metadata: {
        updatedFields: Object.keys({ ...updateData, ...(teacher || {}) }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating license:", error);
    return NextResponse.json(
      { error: "Failed to update license" },
      { status: 500 }
    );
  }
}
