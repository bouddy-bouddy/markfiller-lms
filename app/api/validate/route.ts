import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Activation, EventLog, License } from "@/lib/models";

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const { key, deviceId, ip, userAgent } = await req.json();
  if (!key || !deviceId)
    return NextResponse.json(
      { error: "key and deviceId required" },
      { status: 400 }
    );

  const license = await License.findOne({ key });
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

  const activation = await Activation.findOne({
    license: license._id,
    deviceId,
  });
  if (!activation) {
    await EventLog.create({
      license: license._id,
      type: "validation.failed",
      message: "Unknown device",
    });
    return NextResponse.json(
      { error: "Device not activated" },
      { status: 403 }
    );
  }

  // Update last seen on successful validation
  await Activation.updateOne(
    { _id: (activation as any)._id },
    {
      $set: {
        lastSeenAt: new Date(),
        lastIp: ip || activation.ip,
        userAgent: userAgent || activation.userAgent,
      },
    }
  );

  await EventLog.create({
    license: license._id,
    type: "validation.ok",
    message: "Validation ok",
  });
  return NextResponse.json({ ok: true, validUntil: license.validUntil });
}
