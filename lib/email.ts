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
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: float 6s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(180deg); }
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .subtitle {
      font-size: 14px;
      opacity: 0.9;
      font-weight: 500;
      position: relative;
      z-index: 1;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
      text-align: center;
    }
    .greeting-sub {
      font-size: 16px;
      color: #6b7280;
      text-align: center;
      margin-bottom: 40px;
    }
    .license-card {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 30px;
      border-radius: 16px;
      text-align: center;
      margin: 30px 0;
      position: relative;
      overflow: hidden;
    }
    .license-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
      opacity: 0.3;
    }
    .license-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }
    .license-key {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 3px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: rgba(255, 255, 255, 0.15);
      padding: 20px;
      border-radius: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      margin: 20px 0;
      position: relative;
      z-index: 1;
      backdrop-filter: blur(10px);
    }
    .license-subtitle {
      font-size: 14px;
      opacity: 0.8;
      position: relative;
      z-index: 1;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin: 30px 0;
    }
    .info-card {
      background: #f8fafc;
      padding: 24px;
      border-radius: 12px;
      border-left: 4px solid #10b981;
      position: relative;
    }
    .info-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%);
      border-radius: 12px;
    }
    .info-title {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .info-list {
      list-style: none;
      position: relative;
      z-index: 1;
    }
    .info-list li {
      padding: 8px 0;
      display: flex;
      align-items: center;
    }
    .info-list li::before {
      content: '✓';
      color: #10b981;
      font-weight: bold;
      margin-left: 12px;
      font-size: 16px;
    }
    .highlight {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      padding: 4px 8px;
      border-radius: 6px;
      font-weight: 600;
      color: #1e40af;
    }
    .warning-card {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 1px solid #f59e0b;
      color: #92400e;
      padding: 24px;
      border-radius: 12px;
      margin: 30px 0;
      position: relative;
    }
    .warning-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }
    .warning-title::before {
      content: '⚠️';
      margin-left: 8px;
    }
    .warning-list {
      list-style: none;
    }
    .warning-list li {
      padding: 6px 0;
      position: relative;
      padding-right: 20px;
    }
    .warning-list li::before {
      content: '•';
      color: #f59e0b;
      font-weight: bold;
      position: absolute;
      right: 0;
    }
    .cta-section {
      text-align: center;
      margin: 40px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .cta-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s;
    }
    .cta-button:hover::before {
      left: 100%;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-title {
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .footer-subtitle {
      color: #6b7280;
      margin-bottom: 20px;
    }
    .footer-note {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
      margin: 30px 0;
    }
    @media (max-width: 600px) {
      .email-container {
        margin: 10px;
        border-radius: 16px;
      }
      .header, .content, .footer {
        padding: 30px 20px;
      }
      .license-key {
        font-size: 20px;
        letter-spacing: 2px;
        padding: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">📊 MarkFiller</div>
      <div class="subtitle">نظام إدارة التراخيص المتقدم</div>
    </div>

    <div class="content">
      <div class="greeting">مرحباً ${fullName} 👋</div>
      <div class="greeting-sub">شكراً لثقتك في MarkFiller لتحسين تجربة إدخال الدرجات</div>

      <div class="license-card">
        <div class="license-title">🔑 مفتاح الترخيص الخاص بك</div>
        <div class="license-key">${licenseKey}</div>
        <div class="license-subtitle">Your Personal License Key</div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-title">📋 تفاصيل الترخيص</div>
          <ul class="info-list">
            <li><span class="highlight">مدة الصلاحية:</span> 10 أشهر من تاريخ الإصدار</li>
            <li><span class="highlight">الأجهزة المسموحة:</span> جهاز واحد (أو جهازين في حالات خاصة)</li>
            <li><span class="highlight">الأمان:</span> مرتبط بجهاز محدد لمزيد من الحماية</li>
            <li><span class="highlight">الدعم:</span> دعم فني متاح على مدار الساعة</li>
          </ul>
        </div>
      </div>

      <div class="warning-card">
        <div class="warning-title">تنبيهات مهمة</div>
        <ul class="warning-list">
          <li>لا تشارك مفتاح الترخيص مع الآخرين تحت أي ظرف</li>
          <li>في حالة فقدان المفتاح، يرجى التواصل معنا فوراً</li>
          <li>الترخيص مرتبط بجهاز واحد فقط لضمان الأمان</li>
          <li>احتفظ بهذا البريد الإلكتروني كمرجع</li>
        </ul>
      </div>

      <div class="cta-section">
        <a href="#" class="cta-button">🚀 بدء الاستخدام الآن</a>
      </div>

      <div class="divider"></div>
    </div>

    <div class="footer">
      <div class="footer-title">فريق MarkFiller</div>
      <div class="footer-subtitle">نظام إدارة التراخيص المتقدم</div>
      <p>لأي استفسارات أو مساعدة، نحن هنا لخدمتك</p>
      <div class="footer-note">
        هذا بريد إلكتروني تلقائي، يرجى عدم الرد عليه
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
