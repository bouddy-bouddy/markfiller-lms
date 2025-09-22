"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("admin_token");
    if (t) setToken(t);
  }, []);

  async function login() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("admin_token", data.token);
        setToken(data.token);
      } else {
        alert(data.error || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadLicenses() {
    if (!token) return;
    const res = await fetch("/api/licenses", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setLicenses(data);
  }

  async function createLicense() {
    if (!token) return;
    const fullName = prompt("Teacher full name?") || "";
    const teacherEmail = prompt("Teacher email?") || "";
    if (!fullName || !teacherEmail) return;
    const res = await fetch("/api/licenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fullName, email: teacherEmail }),
    });
    if (res.ok) await loadLicenses();
  }

  async function toggleSuspend(key: string, status: "active" | "suspended") {
    if (!token) return;
    const res = await fetch("/api/licenses", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key, status }),
    });
    if (res.ok) await loadLicenses();
  }

  async function deleteLicense(key: string) {
    if (!token) return;
    if (!confirm("Delete this license? This cannot be undone.")) return;
    const res = await fetch(`/api/licenses?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) await loadLicenses();
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {!token ? (
        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button onClick={login} disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Licenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={loadLicenses}>Refresh</Button>
              <Button onClick={createLicense}>New License</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  localStorage.removeItem("admin_token");
                  setToken(null);
                }}
              >
                Logout
              </Button>
            </div>
            <div className="space-y-2">
              {licenses.map((lic) => (
                <div
                  key={lic._id}
                  className="border rounded p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{lic.key}</div>
                    <div className="text-sm opacity-70">
                      {lic.teacher?.fullName} — {lic.teacher?.email}
                    </div>
                    <div className="text-xs opacity-70">
                      status: {lic.status} — valid until{" "}
                      {new Date(lic.validUntil).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {lic.status === "active" ? (
                      <Button
                        variant="destructive"
                        onClick={() => toggleSuspend(lic.key, "suspended")}
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button onClick={() => toggleSuspend(lic.key, "active")}>
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => deleteLicense(lic.key)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
