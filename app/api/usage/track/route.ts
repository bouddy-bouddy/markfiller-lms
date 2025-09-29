import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { License } from "@/lib/models";
import { checkUploadAllowed, recordUpload } from "@/lib/usage";

export const dynamic = "force-dynamic";

/**
 * POST /api/usage/track
 * Track an upload operation (called from Excel Add-in)
 * Body: { licenseKey: string, metadata?: {...} }
 */
export async function POST(req: NextRequest) {
  await connectToDatabase();

  try {
    const body = await req.json();
    const { licenseKey, metadata } = body;

    if (!licenseKey) {
      return NextResponse.json(
        { error: "License key is required" },
        { status: 400 }
      );
    }

    // Find license
    const license = await License.findOne({ key: licenseKey }).populate(
      "teacher"
    );

    if (!license) {
      return NextResponse.json(
        { error: "Invalid license key" },
        { status: 404 }
      );
    }

    // Check if upload is allowed
    const checkResult = await checkUploadAllowed(license._id);

    if (!checkResult.allowed) {
      return NextResponse.json(
        {
          error: checkResult.reason,
          blocked: true,
          uploadCount: license.uploadCount,
          uploadLimit: license.uploadLimit,
        },
        { status: 403 }
      );
    }

    // Get IP from request
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Record the upload
    const result = await recordUpload(license._id, license.teacher as any, {
      ...metadata,
      ip: ip.split(",")[0].trim(),
    });

    return NextResponse.json({
      success: true,
      uploadCount: result.uploadCount,
      uploadLimit: result.uploadLimit,
      remainingUploads: result.remainingUploads,
      usagePercentage: Math.round(
        (result.uploadCount / result.uploadLimit) * 100
      ),
      suspended: result.suspended,
      warning:
        result.remainingUploads <= 3
          ? "You're running low on uploads!"
          : undefined,
    });
  } catch (error) {
    console.error("Error tracking usage:", error);
    return NextResponse.json(
      { error: "Failed to track usage" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/usage/track?licenseKey=xxx
 * Check current usage status (called from Excel Add-in before upload)
 */
export async function GET(req: NextRequest) {
  await connectToDatabase();

  try {
    const url = new URL(req.url);
    const licenseKey = url.searchParams.get("licenseKey");

    if (!licenseKey) {
      return NextResponse.json(
        { error: "License key is required" },
        { status: 400 }
      );
    }

    const license = await License.findOne({ key: licenseKey });

    if (!license) {
      return NextResponse.json(
        { error: "Invalid license key" },
        { status: 404 }
      );
    }

    const checkResult = await checkUploadAllowed(license._id);

    return NextResponse.json({
      allowed: checkResult.allowed,
      reason: checkResult.reason,
      uploadCount: license.uploadCount,
      uploadLimit: license.uploadLimit,
      remainingUploads: checkResult.remainingUploads,
      usagePercentage: checkResult.usagePercentage,
      status: license.status,
    });
  } catch (error) {
    console.error("Error checking usage:", error);
    return NextResponse.json(
      { error: "Failed to check usage" },
      { status: 500 }
    );
  }
}
