import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { License, Activation, EventLog } from "@/lib/models";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface UsageEvent {
  key: string;
  deviceId: string;
  eventType: string;
  metadata?: any;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  await connectToDatabase();

  try {
    const body: UsageEvent = await req.json();
    const { key, deviceId, eventType, metadata, timestamp } = body;

    if (!key || !deviceId || !eventType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the license
    const license = await License.findOne({ key }).populate("teacher");
    if (!license) {
      return NextResponse.json(
        { error: "Invalid license key" },
        { status: 404 }
      );
    }

    // Verify the device is activated for this license
    const activation = await Activation.findOne({
      license: license._id,
      deviceId,
    });

    if (!activation) {
      return NextResponse.json(
        { error: "Device not activated for this license" },
        { status: 403 }
      );
    }

    // Log the usage event
    await EventLog.create({
      license: license._id,
      teacher: license.teacher?._id,
      type: `usage.${eventType}`,
      message: `Usage event: ${eventType}`,
      metadata: {
        deviceId,
        eventType,
        timestamp,
        ...metadata,
      },
    });

    // Update activation last seen time
    await Activation.updateOne(
      { _id: activation._id },
      {
        $set: {
          lastSeenAt: new Date(timestamp),
          lastActivity: eventType,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Usage tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track usage" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve usage statistics for a license
export async function GET(req: NextRequest) {
  await connectToDatabase();

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const days = parseInt(searchParams.get("days") || "30");

    if (!key) {
      return NextResponse.json(
        { error: "License key required" },
        { status: 400 }
      );
    }

    const license = await License.findOne({ key });
    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get usage events for this license
    const events = await EventLog.find({
      license: license._id,
      type: { $regex: /^usage\./ },
      createdAt: { $gte: since },
    })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    // Get activations
    const activations = await Activation.find({
      license: license._id,
    }).lean();

    // Aggregate usage statistics
    const stats = {
      totalEvents: events.length,
      uniqueDays: new Set(
        events.map((e) => e.createdAt.toISOString().split("T")[0])
      ).size,
      activeDevices: activations.length,
      eventBreakdown: events.reduce((acc: any, event: any) => {
        const eventType = event.type.replace("usage.", "");
        acc[eventType] = (acc[eventType] || 0) + 1;
        return acc;
      }, {}),
      dailyUsage: events.reduce((acc: any, event: any) => {
        const date = event.createdAt.toISOString().split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}),
      lastActivity: events[0]?.createdAt || null,
    };

    return NextResponse.json({ stats, events: events.slice(0, 50) });
  } catch (error) {
    console.error("Usage stats error:", error);
    return NextResponse.json(
      { error: "Failed to get usage stats" },
      { status: 500 }
    );
  }
}
