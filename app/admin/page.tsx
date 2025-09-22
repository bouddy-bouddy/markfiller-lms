"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type License = {
  _id: string;
  key: string;
  status: "active" | "suspended" | "expired";
  validUntil: string;
  allowedDevices: number;
  teacher?: { fullName?: string; email?: string };
};

export default function AdminHome() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  async function loadLicenses() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`/api/licenses?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setLicenses(data);
    } finally {
      setLoading(false);
    }
  }

  async function mutate(key: string, next: "active" | "suspended") {
    const res = await fetch("/api/licenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key, status: next }),
    });
    if (res.ok) loadLicenses();
  }

  async function remove(key: string) {
    if (!confirm("Delete this license?")) return;
    const res = await fetch(`/api/licenses?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) loadLicenses();
  }

  useEffect(() => {
    loadLicenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return licenses.filter((l) =>
      status === "all" ? true : l.status === status
    );
  }, [licenses, status]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {licenses.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {licenses.filter((l) => l.status === "active").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {licenses.filter((l) => l.status === "suspended").length}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Licenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Search by key/status/email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadLicenses()}
              className="w-64"
            />
            <Button onClick={loadLicenses} disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </Button>
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            {filtered.map((lic) => (
              <div key={lic._id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <span>{lic.key}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          lic.status === "active"
                            ? "bg-green-100 text-green-800"
                            : lic.status === "suspended"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {lic.status}
                      </span>
                    </div>
                    <div className="text-sm opacity-70">
                      {lic.teacher?.fullName} — {lic.teacher?.email}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {lic.status === "active" ? (
                      <Button
                        variant="secondary"
                        onClick={() => mutate(lic.key, "suspended")}
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button onClick={() => mutate(lic.key, "active")}>
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => remove(lic.key)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="text-xs opacity-70 mt-2">
                  valid until {new Date(lic.validUntil).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
