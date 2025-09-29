import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Activation, EventLog, License, Teacher } from "@/lib/models";
import { updateLicenseLimits } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const body = await req.json();
  const {
    key,
    deviceId,
    profile,
  }: {
    key: string;
    deviceId: string;
    profile?: {
      cin?: string;
      phone?: string;
      level?: "الإعدادي" | "الثانوي";
      subject?: string;
      classesCount?: number;
      testsPerTerm?: number;
    };
  } = body;

  if (!key || !deviceId) {
    return NextResponse.json(
      { error: "key and deviceId required" },
      { status: 400 }
    );
  }

  const license = await License.findOne({ key }).populate("teacher");
  if (!license) {
    await EventLog.create({
      type: "activation.rejected",
      message: "Invalid license key",
      metadata: { key, deviceId },
    });
    return NextResponse.json({ error: "Invalid license key" }, { status: 404 });
  }

  if (license.status === "expired") {
    return NextResponse.json({ error: "License has expired" }, { status: 403 });
  }

  if (license.status === "suspended") {
    return NextResponse.json(
      { error: "License suspended due to usage limit" },
      { status: 403 }
    );
  }

  const activationCount = await Activation.countDocuments({
    license: license._id,
  });

  if (activationCount >= license.allowedDevices) {
    const existingActivation = await Activation.findOne({
      license: license._id,
      deviceId,
    });

    if (!existingActivation) {
      await EventLog.create({
        license: license._id,
        type: "activation.rejected",
        message: "Device limit exceeded",
      });
      return NextResponse.json(
        { error: "Device limit exceeded" },
        { status: 403 }
      );
    }
  }

  // Update teacher profile if provided
  let updatedLimit = license.uploadLimit;
  if (profile && license.teacher) {
    const teacherId = (license.teacher as any)._id || license.teacher;
    const teacher = await Teacher.findById(teacherId);

    if (teacher) {
      let needsLimitUpdate = false;

      // Update teacher fields
      if (profile.cin !== undefined) teacher.cin = profile.cin;
      if (profile.phone !== undefined) teacher.phone = profile.phone;
      if (profile.level !== undefined) teacher.level = profile.level;
      if (profile.subject !== undefined) teacher.subject = profile.subject;

      // Check if classesCount or testsPerTerm changed
      if (
        profile.classesCount !== undefined &&
        profile.classesCount !== teacher.classesCount
      ) {
        teacher.classesCount = profile.classesCount;
        needsLimitUpdate = true;
      }
      if (
        profile.testsPerTerm !== undefined &&
        profile.testsPerTerm !== teacher.testsPerTerm
      ) {
        teacher.testsPerTerm = profile.testsPerTerm;
        needsLimitUpdate = true;
      }

      await teacher.save();

      // Update license limits if needed
      if (needsLimitUpdate && teacher.classesCount && teacher.testsPerTerm) {
        updatedLimit = await updateLicenseLimits(
          teacherId,
          teacher.testsPerTerm,
          teacher.classesCount
        );
      }
    }
  }

  // Create or update activation
  const existingActivation = await Activation.findOne({
    license: license._id,
    deviceId,
  });

  const userAgent = req.headers.get("user-agent") || undefined;
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    undefined;

  if (existingActivation) {
    existingActivation.lastSeenAt = new Date();
    existingActivation.lastIp = ip;
    await existingActivation.save();
  } else {
    await Activation.create({
      license: license._id,
      deviceId,
      userAgent,
      ip,
      lastSeenAt: new Date(),
      lastIp: ip,
    });
    await EventLog.create({
      license: license._id,
      type: "activation.created",
      message: "New device activation",
    });
  }

  return NextResponse.json({
    ok: true,
    validUntil: license.validUntil,
    uploadLimit: updatedLimit,
    uploadCount: license.uploadCount,
    remainingUploads: Math.max(0, updatedLimit - license.uploadCount),
  });
}
