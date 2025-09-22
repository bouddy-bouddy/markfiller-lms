import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Activation, EventLog, License, Teacher } from "@/lib/models";

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const { key, deviceId, userAgent, ip, profile } = await req.json();

  if (!key || !deviceId) {
    return NextResponse.json(
      { error: "key and deviceId are required" },
      { status: 400 }
    );
  }

  const license = await License.findOne({ key }).populate("teacher");
  if (!license)
    return NextResponse.json({ error: "Invalid key" }, { status: 404 });

  if (license.status !== "active") {
    return NextResponse.json(
      { error: `License ${license.status}` },
      { status: 403 }
    );
  }

  if (new Date(license.validUntil).getTime() < Date.now()) {
    license.status = "expired";
    await license.save();
    await EventLog.create({
      license: license._id,
      type: "license.expired",
      message: "License expired on validate",
    });
    return NextResponse.json({ error: "License expired" }, { status: 403 });
  }

  const existingActivations = await Activation.find({ license: license._id });

  // If device already activated, return OK
  const already = existingActivations.find((a) => a.deviceId === deviceId);
  if (already) {
    await EventLog.create({
      license: license._id,
      type: "validation.ok",
      message: "Existing device validated",
    });
    return NextResponse.json({ ok: true, validUntil: license.validUntil });
  }

  // Enforce device limit
  if (existingActivations.length >= license.allowedDevices) {
    // Suspend on suspicious attempt (install on another device)
    license.status = "suspended";
    await license.save();
    await EventLog.create({
      license: license._id,
      type: "activation.rejected",
      message: "Device limit exceeded; license suspended",
      metadata: { attemptedDeviceId: deviceId },
    });
    return NextResponse.json(
      { error: "Device limit exceeded. License suspended." },
      { status: 403 }
    );
  }

  // Update teacher profile if provided
  if (profile && license.teacher) {
    const teacherId = (license.teacher as any)._id || license.teacher;
    await Teacher.findByIdAndUpdate(
      teacherId,
      {
        cin: profile.cin,
        phone: profile.phone,
        level: profile.level,
        subject: profile.subject,
        classesCount: profile.classesCount,
        testsPerTerm: profile.testsPerTerm,
      },
      { new: true }
    );
  }

  await Activation.create({ license: license._id, deviceId, userAgent, ip });
  await EventLog.create({
    license: license._id,
    type: "activation.created",
    message: "New device activation",
  });

  return NextResponse.json({ ok: true, validUntil: license.validUntil });
}
