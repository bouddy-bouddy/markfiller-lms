import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { EventLog, License, Teacher, Activation } from "@/lib/models";
import { ADMIN_TOKEN_COOKIE, getAuthHeaderToken, verifyJwt } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  await connectToDatabase();

  // Admin-only
  try {
    const tokenFromHeader = getAuthHeaderToken(
      req.headers.get("authorization")
    );
    const tokenFromCookie = req.cookies.get(ADMIN_TOKEN_COOKIE)?.value || null;
    const token = tokenFromHeader || tokenFromCookie;
    if (!token) throw new Error("Unauthorized");
    const payload = verifyJwt(token);
    if (payload.role !== "admin") throw new Error("Forbidden");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30); // last 30 days
  const events = await EventLog.find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const totalLicenses = await License.countDocuments({});
  const activeLicenses = await License.countDocuments({ status: "active" });
  const suspendedLicenses = await License.countDocuments({
    status: "suspended",
  });
  const expiredLicenses = await License.countDocuments({ status: "expired" });
  const totalTeachers = await Teacher.countDocuments({});
  const totalActivations = await Activation.countDocuments({});

  const last7Days = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const activationsLast7 = await EventLog.countDocuments({
    type: "activation.created",
    createdAt: { $gte: last7Days },
  });
  const validationsLast7 = await EventLog.countDocuments({
    type: "validation.ok",
    createdAt: { $gte: last7Days },
  });

  // Time series for charts: daily counts for last 14 days
  const days = 14;
  const start = new Date(Date.now() - 1000 * 60 * 60 * 24 * (days - 1));
  const seriesAgg = async (type: string) =>
    EventLog.aggregate([
      { $match: { type, createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

  const activationsSeries = await seriesAgg("activation.created");
  const validationsSeries = await seriesAgg("validation.ok");
  const createdSeries = await EventLog.aggregate([
    { $match: { type: "license.created", createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return NextResponse.json({
    summary: {
      totalLicenses,
      activeLicenses,
      suspendedLicenses,
      expiredLicenses,
      totalTeachers,
      totalActivations,
      activationsLast7,
      validationsLast7,
    },
    charts: {
      days,
      activationsSeries,
      validationsSeries,
      createdSeries,
    },
    events,
  });
}
