"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function parseJsonSafe(res: Response) {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function login() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await parseJsonSafe(res);
      if (res.ok) {
        if (data?.token) localStorage.setItem("admin_token", data.token);
        window.location.replace("/admin");
      } else {
        alert((data && (data.error as string)) || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,theme(colors.slate.100),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,theme(colors.slate.900),transparent_60%)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>MarkFiller License Manager</CardTitle>
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
          <Button onClick={login} disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
