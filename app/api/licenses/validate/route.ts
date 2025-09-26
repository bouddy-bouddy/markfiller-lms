import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { License, Activation, EventLog } from "@/lib/models";
import { differenceInDays } from "date-fns";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ValidationRequest {
  key: string;
  deviceId: string;
  deviceInfo?: {
    userAgent?: string;
    language?: string;
    platform?: string;
    screenResolution?: string;
    timezone?: string;
    excelVersion?: string;
  };
}

export async function POST(req: NextRequest) {
  await connectToDatabase();

  try {
    const body: ValidationRequest = await req.json();
    const { key, deviceId, deviceInfo } = body;

    // Validate request
    if (!key || !deviceId) {
      return NextResponse.json(
        {
          valid: false,
          message: "مفتاح الترخيص ومعرف الجهاز مطلوبان",
        },
        { status: 400 }
      );
    }

    // Find the license
    const license = await License.findOne({ key }).populate("teacher");

    if (!license) {
      // Log failed validation attempt
      await EventLog.create({
        type: "validation.failed",
        message: `Invalid license key attempted: ${key}`,
        metadata: { deviceId, deviceInfo },
      });

      return NextResponse.json(
        {
          valid: false,
          message: "مفتاح الترخيص غير موجود",
        },
        { status: 404 }
      );
    }

    // Check if license is active
    if (license.status !== "active") {
      await EventLog.create({
        license: license._id,
        teacher: license.teacher?._id,
        type: "validation.failed",
        message: `License is ${license.status}`,
        metadata: { deviceId },
      });

      return NextResponse.json(
        {
          valid: false,
          message:
            license.status === "suspended"
              ? "تم تعليق هذا الترخيص. الرجاء التواصل مع الدعم."
              : "الترخيص غير نشط",
        },
        { status: 403 }
      );
    }

    // Check expiration
    const now = new Date();
    const validUntil = new Date(license.validUntil);

    if (validUntil < now) {
      await EventLog.create({
        license: license._id,
        teacher: license.teacher?._id,
        type: "validation.failed",
        message: "License expired",
        metadata: {
          expiredAt: validUntil.toISOString(),
          deviceId,
        },
      });

      return NextResponse.json(
        {
          valid: false,
          message: "انتهت صلاحية هذا الترخيص",
        },
        { status: 403 }
      );
    }

    // Check device limit
    const existingActivations = await Activation.find({
      license: license._id,
    }).sort({ activatedAt: 1 });

    const currentDeviceActivation = existingActivations.find(
      (a) => a.deviceId === deviceId
    );

    if (!currentDeviceActivation) {
      // New device trying to activate
      if (existingActivations.length >= license.allowedDevices) {
        // Device limit exceeded
        await EventLog.create({
          license: license._id,
          teacher: license.teacher?._id,
          type: "validation.failed",
          message: "Device limit exceeded",
          metadata: {
            deviceId,
            currentDevices: existingActivations.length,
            allowedDevices: license.allowedDevices,
          },
        });

        return NextResponse.json(
          {
            valid: false,
            message: `هذا الترخيص مفعل بالفعل على ${license.allowedDevices} جهاز. الرجاء إلغاء التفعيل من جهاز آخر أولاً.`,
          },
          { status: 403 }
        );
      }

      // Create new activation
      await Activation.create({
        license: license._id,
        deviceId,
        deviceInfo: deviceInfo || {},
        activatedAt: now,
        lastValidatedAt: now,
      });

      await EventLog.create({
        license: license._id,
        teacher: license.teacher?._id,
        type: "device.activated",
        message: "New device activated",
        metadata: { deviceId, deviceInfo },
      });
    } else {
      // Update last seen time for existing device
      currentDeviceActivation.lastSeenAt = now;
      await currentDeviceActivation.save();
    }

    // Log successful validation
    await EventLog.create({
      license: license._id,
      teacher: license.teacher?._id,
      type: "validation.success",
      message: "License validated successfully",
      metadata: { deviceId },
    });

    // Calculate remaining days
    const remainingDays = differenceInDays(validUntil, now);

    // Return success response
    return NextResponse.json({
      valid: true,
      teacher: {
        fullName: (license.teacher as any)?.fullName || "Unknown",
        email: (license.teacher as any)?.email || "",
      },
      expiresAt: validUntil.toISOString(),
      remainingDays,
      deviceCount:
        existingActivations.length + (currentDeviceActivation ? 0 : 1),
      maxDevices: license.allowedDevices,
    });
  } catch (error) {
    console.error("License validation error:", error);

    return NextResponse.json(
      {
        valid: false,
        message: "حدث خطأ أثناء التحقق من الترخيص",
      },
      { status: 500 }
    );
  }
}

// Endpoint to deactivate a device
export async function DELETE(req: NextRequest) {
  await connectToDatabase();

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const deviceId = searchParams.get("deviceId");

    if (!key || !deviceId) {
      return NextResponse.json(
        { error: "License key and device ID required" },
        { status: 400 }
      );
    }

    const license = await License.findOne({ key });

    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    const activation = await Activation.findOneAndDelete({
      license: license._id,
      deviceId,
    });

    if (!activation) {
      return NextResponse.json(
        { error: "Device not found for this license" },
        { status: 404 }
      );
    }

    await EventLog.create({
      license: license._id,
      type: "device.deactivated",
      message: "Device deactivated",
      metadata: { deviceId },
    });

    return NextResponse.json({
      success: true,
      message: "Device deactivated successfully",
    });
  } catch (error) {
    console.error("Device deactivation error:", error);

    return NextResponse.json(
      { error: "Failed to deactivate device" },
      { status: 500 }
    );
  }
}
