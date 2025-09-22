import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || SMTP_USER || "";

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
  // Do not throw here to allow local dev without email, but warn
  console.warn(
    "[email] SMTP env vars are not fully set; email sending will fail."
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

export async function sendMail(to: string, subject: string, html: string) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
    throw new Error("SMTP configuration missing");
  }
  await transporter.sendMail({ from: MAIL_FROM, to, subject, html });
}

export function licenseEmailTemplate(fullName: string, licenseKey: string) {
  return `
  <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;">
    <h2>مرحباً ${fullName}</h2>
    <p>شكراً لاقتناء إضافة MarkFiller. هذا هو مفتاح الترخيص الخاص بك:</p>
    <p style="font-size:18px;font-weight:bold;letter-spacing:1px;">${licenseKey}</p>
    <p>صلاحية الترخيص: 10 أشهر من تاريخ الإصدار. الترخيص مرتبط بجهاز واحد (إلا في حالات خاصة).</p>
    <p>لا تشارك مفتاحك مع الآخرين. لأي مساعدة، راسلنا على هذا البريد.</p>
  </div>
  `;
}
