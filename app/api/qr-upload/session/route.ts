import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { QrSession } from "@/lib/QrSession";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/qr-upload/session
 * Create a new QR upload session
 * Called from Excel Add-in to generate a QR code
 */
export async function POST(req: NextRequest) {
  await connectToDatabase();

  try {
    const { licenseKey } = await req.json();

    if (!licenseKey) {
      return NextResponse.json(
        { error: "License key is required" },
        { status: 400 }
      );
    }

    // Generate unique session ID (short and easy to encode in QR)
    const sessionId = nanoid(12); // e.g., "V1StGXR8_Z5j"

    // Create session with 10 minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const session = await QrSession.create({
      sessionId,
      licenseKey,
      status: "pending", // pending, completed, expired
      expiresAt,
      createdAt: new Date(),
    });

    // Generate upload URL for QR code
    const uploadUrl = `${
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    }/upload/${sessionId}`;

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      uploadUrl,
      expiresAt: session.expiresAt,
      expiresIn: 600, // seconds
    });
  } catch (error) {
    console.error("Error creating QR session:", error);
    return NextResponse.json(
      { error: "Failed to create upload session" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/qr-upload/session/:sessionId
 * Check session status (polling from Excel Add-in)
 */
export async function GET(req: NextRequest) {
  await connectToDatabase();

  try {
    const url = new URL(req.url);
    const sessionId = url.pathname.split("/").pop();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await QrSession.findOne({ sessionId });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      await QrSession.updateOne({ sessionId }, { $set: { status: "expired" } });
      return NextResponse.json({
        status: "expired",
        message: "Session expired",
      });
    }

    return NextResponse.json({
      status: session.status,
      imageUrl: session.imageUrl,
      uploadedAt: session.uploadedAt,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
