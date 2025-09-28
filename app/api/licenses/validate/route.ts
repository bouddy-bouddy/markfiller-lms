// app/api/licenses/validate/route.ts - ENHANCED VERSION
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

// Helper function to get client IP
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

export async function POST(req: NextRequest) {
  await connectToDatabase();

  try {
    const body: ValidationRequest = await req.json();
    const { key, deviceId, deviceInfo } = body;
    const clientIp = getClientIp(req);

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
        metadata: { deviceId, deviceInfo, ip: clientIp },
      });

      return NextResponse.json(
        {
          valid: false,
          message: "مفتاح الترخيص غير صحيح أو غير موجود",
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
        metadata: { deviceId, ip: clientIp },
      });

      return NextResponse.json(
        {
          valid: false,
          message:
            license.status === "suspended"
              ? "تم تعليق هذا الترخيص. الرجاء التواصل مع الدعم."
              : "انتهت صلاحية هذا الترخيص.",
        },
        { status: 403 }
      );
    }

    // Check expiration date
    const now = new Date();
    if (license.validUntil && license.validUntil < now) {
      // Update license status
      license.status = "expired";
      await license.save();

      await EventLog.create({
        license: license._id,
        teacher: license.teacher?._id,
        type: "validation.failed",
        message: "License expired",
        metadata: { deviceId, ip: clientIp },
      });

      return NextResponse.json(
        {
          valid: false,
          message: "انتهت صلاحية الترخيص",
        },
        { status: 403 }
      );
    }

    // Check for existing activation
    let activation = await Activation.findOne({
      license: license._id,
      deviceId: deviceId,
    });

    if (!activation) {
      // Check if max devices reached
      const activeDevices = await Activation.countDocuments({
        license: license._id,
      });

      if (activeDevices >= license.allowedDevices) {
        await EventLog.create({
          license: license._id,
          teacher: license.teacher?._id,
          type: "validation.failed",
          message: "Max devices reached",
          metadata: {
            deviceId,
            currentDevices: activeDevices,
            maxDevices: license.allowedDevices,
            ip: clientIp,
          },
        });

        return NextResponse.json(
          {
            valid: false,
            message: `تم الوصول إلى الحد الأقصى للأجهزة المسموح بها (${license.allowedDevices}). الرجاء إلغاء تفعيل أحد الأجهزة الأخرى أو التواصل مع الدعم.`,
            devicesUsed: activeDevices,
            maxDevices: license.allowedDevices,
          },
          { status: 403 }
        );
      }

      // Create new activation
      activation = await Activation.create({
        license: license._id,
        teacher: license.teacher?._id,
        deviceId: deviceId,
        userAgent: deviceInfo?.userAgent,
        ip: clientIp,
        activatedAt: now,
        lastSeenAt: now,
        lastIp: clientIp,
        metadata: deviceInfo,
      });

      await EventLog.create({
        license: license._id,
        teacher: license.teacher?._id,
        type: "device.activated",
        message: "New device activated",
        metadata: {
          deviceId,
          deviceInfo,
          ip: clientIp,
          activationNumber: activeDevices + 1,
        },
      });
    } else {
      // Update last seen
      activation.lastSeenAt = now;
      activation.lastIp = clientIp;

      // Update metadata if provided
      if (deviceInfo) {
        activation.metadata = { ...activation.metadata, ...deviceInfo };
      }

      await activation.save();

      // Log validation success (only once per day per device)
      const lastLog = await EventLog.findOne({
        license: license._id,
        type: "validation.success",
        "metadata.deviceId": deviceId,
      }).sort({ createdAt: -1 });

      const shouldLog =
        !lastLog || differenceInDays(now, lastLog.createdAt) >= 1;

      if (shouldLog) {
        await EventLog.create({
          license: license._id,
          teacher: license.teacher?._id,
          type: "validation.success",
          message: "License validated successfully",
          metadata: { deviceId, ip: clientIp },
        });
      }
    }

    // Get current device count
    const devicesUsed = await Activation.countDocuments({
      license: license._id,
    });

    // Calculate days remaining
    const daysRemaining = license.validUntil
      ? differenceInDays(license.validUntil, now)
      : null;

    return NextResponse.json({
      valid: true,
      message: "الترخيص صالح",
      teacherName: (license.teacher as any)?.fullName || "مستخدم",
      expiresAt: license.validUntil?.toISOString(),
      daysRemaining,
      devicesUsed,
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

// Endpoint to deactivate a device (for future use)
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
      message: "تم إلغاء تفعيل الجهاز بنجاح",
    });
  } catch (error) {
    console.error("Device deactivation error:", error);

    return NextResponse.json(
      { error: "Failed to deactivate device" },
      { status: 500 }
    );
  }
}
