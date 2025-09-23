"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Settings = {
  [key: string]: any;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setSettings(data);
    } finally {
      setLoading(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      alert("Settings saved");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testTo) return alert("Enter an email address");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "test-email", to: testTo }),
    });
    const data = await res.json().catch(() => ({} as any));
    if (res.ok) alert("Test email sent");
    else alert(data.error || "Failed to send test email");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">System Settings</div>
        <Button onClick={saveAll} disabled={saving}>
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-1">SMTP Host</div>
            <Input
              placeholder="smtp.gmail.com"
              value={settings["email.smtp.host"] || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  ["email.smtp.host"]: e.target.value,
                })
              }
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">SMTP Port</div>
              <Input
                type="number"
                placeholder="587"
                value={settings["email.smtp.port"] || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ["email.smtp.port"]: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">From Email Address</div>
              <Input
                placeholder="no-reply@example.com"
                value={settings["email.from"] || ""}
                onChange={(e) =>
                  setSettings({ ...settings, ["email.from"]: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-1">SMTP Username</div>
              <Input
                placeholder="username"
                value={settings["email.smtp.user"] || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ["email.smtp.user"]: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">SMTP Password</div>
              <Input
                type="password"
                placeholder="••••••••"
                value={settings["email.smtp.pass"] || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ["email.smtp.pass"]: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <div className="text-sm font-medium mb-1">Send Test Email</div>
              <Input
                placeholder="test@example.com"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={sendTest}>
              Send Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
