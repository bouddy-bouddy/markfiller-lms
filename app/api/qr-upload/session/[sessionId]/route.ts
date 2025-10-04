import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { QrSession } from "@/lib/QrSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/qr-upload/session/:sessionId
 * Check session status (polling from Excel Add-in)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  await connectToDatabase();

  try {
    const { sessionId } = await params;

    console.log("📊 Checking status for session:", sessionId);

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await QrSession.findOne({ sessionId });

    if (!session) {
      console.log("❌ Session not found:", sessionId);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      console.log("⏰ Session expired:", sessionId);
      await QrSession.updateOne({ sessionId }, { $set: { status: "expired" } });
      return NextResponse.json({
        status: "expired",
        message: "Session expired",
      });
    }

    console.log("✅ Session status:", session.status);

    return NextResponse.json({
      status: session.status,
      imageUrl: session.imageUrl,
      uploadedAt: session.uploadedAt,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("❌ Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
