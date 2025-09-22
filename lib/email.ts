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
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MarkFiller License Key</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #007bff;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #007bff;
      margin-bottom: 10px;
    }
    .greeting {
      font-size: 18px;
      color: #495057;
      margin-bottom: 20px;
    }
    .license-box {
      background: linear-gradient(135deg, #007bff, #0056b3);
      color: white;
      padding: 25px;
      border-radius: 8px;
      text-align: center;
      margin: 25px 0;
      box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
    }
    .license-key {
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
      background: rgba(255, 255, 255, 0.1);
      padding: 15px;
      border-radius: 6px;
      border: 2px dashed rgba(255, 255, 255, 0.3);
      margin: 15px 0;
    }
    .info-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #28a745;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      color: #6c757d;
      font-size: 14px;
    }
    .btn {
      display: inline-block;
      background: #28a745;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 15px 0;
    }
    .highlight {
      background: #e3f2fd;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📊 MarkFiller</div>
      <div style="color: #6c757d; font-size: 14px;">نظام إدارة التراخيص - License Management System</div>
    </div>

    <div class="greeting">
      مرحباً <strong>${fullName}</strong> 👋<br>
      شكراً لاقتناء إضافة MarkFiller لتحسين تجربة إدخال الدرجات
    </div>

    <div class="license-box">
      <div style="font-size: 16px; margin-bottom: 10px;">🔑 مفتاح الترخيص الخاص بك</div>
      <div class="license-key">${licenseKey}</div>
      <div style="font-size: 14px; opacity: 0.9;">Your License Key</div>
    </div>

    <div class="info-section">
      <h3 style="margin-top: 0; color: #28a745;">📋 معلومات الترخيص</h3>
      <ul style="margin: 10px 0; padding-right: 20px;">
        <li><span class="highlight">مدة الصلاحية:</span> 10 أشهر من تاريخ الإصدار</li>
        <li><span class="highlight">الأجهزة المسموحة:</span> جهاز واحد (أو جهازين في حالات خاصة)</li>
        <li><span class="highlight">الاستخدام:</span> مرتبط بجهاز محدد لمزيد من الأمان</li>
      </ul>
    </div>

    <div class="warning">
      <strong>⚠️ تنبيه مهم:</strong><br>
      • لا تشارك مفتاح الترخيص مع الآخرين<br>
      • في حالة فقدان المفتاح، يرجى التواصل معنا<br>
      • الترخيص مرتبط بجهاز واحد فقط
    </div>

    <div style="text-align: center; margin: 25px 0;">
      <a href="#" class="btn">🚀 بدء الاستخدام</a>
    </div>

    <div class="footer">
      <p>لأي استفسارات أو مساعدة، لا تتردد في التواصل معنا</p>
      <p style="margin: 5px 0;"><strong>MarkFiller Team</strong> | نظام إدارة التراخيص</p>
      <p style="font-size: 12px; color: #adb5bd;">هذا بريد إلكتروني تلقائي، يرجى عدم الرد عليه</p>
    </div>
  </div>
</body>
</html>
  `;
}
