export async function activateLicense(params: {
  key: string;
  deviceId: string;
  userAgent?: string;
  ip?: string;
  profile?: {
    cin?: string;
    phone?: string;
    level?: "الإعدادي" | "الثانوي";
    subject?: string;
    classesCount?: number;
    testsPerTerm?: number;
  };
}) {
  const res = await fetch("/api/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Activation failed");
  return data as { ok: true; validUntil: string };
}

export async function validateLicense(params: {
  key: string;
  deviceId: string;
}) {
  const res = await fetch("/api/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Validation failed");
  return data as { ok: true; validUntil: string };
}
