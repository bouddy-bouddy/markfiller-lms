import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { QrSession } from "@/lib/QrSession";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/qr-upload/upload
 * Upload image from mobile device
 */
export async function POST(req: NextRequest) {
  await connectToDatabase();

  try {
    console.log("📤 Upload request received");

    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string;
    const image = formData.get("image") as File;

    console.log("📋 Session ID:", sessionId);
    console.log("🖼️ Image:", image ? image.name : "No image");

    if (!sessionId || !image) {
      console.error("❌ Missing sessionId or image");
      return NextResponse.json(
        { error: "Session ID and image are required" },
        { status: 400 }
      );
    }

    // Validate session
    const session = await QrSession.findOne({ sessionId });

    if (!session) {
      console.error("❌ Session not found:", sessionId);
      return NextResponse.json({ error: "Invalid session" }, { status: 404 });
    }

    if (session.status === "completed") {
      console.error("❌ Session already used");
      return NextResponse.json(
        { error: "Session already used" },
        { status: 400 }
      );
    }

    if (new Date() > session.expiresAt) {
      console.error("❌ Session expired");
      await QrSession.updateOne({ sessionId }, { $set: { status: "expired" } });
      return NextResponse.json({ error: "Session expired" }, { status: 400 });
    }

    // Validate image type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(image.type)) {
      console.error("❌ Invalid image type:", image.type);
      return NextResponse.json(
        { error: "Invalid image format. Only JPEG, PNG, and WebP are allowed" },
        { status: 400 }
      );
    }

    // Validate image size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      console.error("❌ Image too large:", image.size);
      return NextResponse.json(
        { error: "Image too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "uploads", "qr-marksheets");
    if (!existsSync(uploadDir)) {
      console.log("📁 Creating upload directory");
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = image.name.split(".").pop() || "jpg";
    const filename = `${sessionId}_${timestamp}.${extension}`;
    const filepath = join(uploadDir, filename);

    console.log("💾 Saving to:", filepath);

    // Save image to disk
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Generate public URL
    const imageUrl = `/uploads/qr-marksheets/${filename}`;

    console.log("✅ Image saved, URL:", imageUrl);

    // Update session
    await QrSession.updateOne(
      { sessionId },
      {
        $set: {
          status: "completed",
          imageUrl,
          imageName: image.name,
          imageSize: image.size,
          uploadedAt: new Date(),
        },
      }
    );

    console.log("✅ Session updated to completed");

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl,
      sessionId,
    });
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
