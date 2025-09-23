import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Setting } from "@/lib/models";
import { ADMIN_TOKEN_COOKIE, getAuthHeaderToken, verifyJwt } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { sendMail } from "@/lib/email";

async function requireAdmin(req: NextRequest) {
  const tokenFromHeader = getAuthHeaderToken(req.headers.get("authorization"));
  const tokenFromCookie = req.cookies.get(ADMIN_TOKEN_COOKIE)?.value || null;
  const token = tokenFromHeader || tokenFromCookie;
  if (!token) throw new Error("Unauthorized");
  const payload = verifyJwt(token);
  if (payload.role !== "admin") throw new Error("Forbidden");
  return payload;
}

export async function GET(req: NextRequest) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const keys = [
    "email.enabled",
    "email.smtp.host",
    "email.smtp.port",
    "email.smtp.user",
    "email.smtp.pass",
    "email.from",
  ];
  const docs = await Setting.find({ key: { $in: keys } });
  const out: Record<string, any> = {};
  for (const d of docs) out[d.key] = d.value;
  return NextResponse.json(out);
}

export async function PUT(req: NextRequest) {
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const updates: Record<string, any> = await req.json();
  const entries = Object.entries(updates);
  for (const [key, value] of entries) {
    await Setting.updateOne(
      { key },
      { $set: { value, updatedAt: new Date() } },
      { upsert: true }
    );
  }
  return NextResponse.json({ saved: true });
}

export async function POST(req: NextRequest) {
  // action endpoint: { action: "test-email", to }
  await connectToDatabase();
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { action, to } = await req.json();
  if (action !== "test-email")
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  try {
    await sendMail(
      String(to),
      "MarkFiller Test Email",
      `<p>This is a test email from MarkFiller.</p>`
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
