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
    const uploadUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/upload/${sessionId}`;

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
