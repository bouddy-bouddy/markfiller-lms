"use client";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Activation = {
  _id: string;
  deviceId: string;
  userAgent?: string;
  ip?: string;
  activatedAt: string;
  lastSeenAt?: string;
  lastIp?: string;
};

type Log = {
  _id: string;
  type: string;
  message?: string;
  createdAt: string;
};

type License = {
  _id: string;
  key: string;
  status: "active" | "suspended" | "expired";
  validUntil: string;
  allowedDevices: number;
  teacher?: { fullName?: string; email?: string };
};

export default function LicenseDetails({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const [license, setLicense] = useState<License | null>(null);
  const [activations, setActivations] = useState<Activation[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const { key: pkey } = use(params);
  const key = decodeURIComponent(pkey);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/licenses/${encodeURIComponent(key)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setLicense(data.license);
        setActivations(data.activations || []);
        setLogs(data.logs || []);
      }
    }
    load();
  }, [key]);

  if (!license) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">{license.key}</div>
        <Badge
          variant={
            license.status === "active"
              ? "secondary"
              : license.status === "suspended"
              ? "destructive"
              : "outline"
          }
        >
          {license.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-2">Device ID</th>
                <th className="py-2">Activated</th>
                <th className="py-2">Last Seen</th>
                <th className="py-2">IP</th>
                <th className="py-2">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {activations.map((a) => (
                <tr key={a._id} className="border-t">
                  <td className="py-2 font-mono text-xs break-all">
                    {a.deviceId}
                  </td>
                  <td className="py-2">
                    {new Date(a.activatedAt).toLocaleString()}
                  </td>
                  <td className="py-2">
                    {a.lastSeenAt
                      ? new Date(a.lastSeenAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2">{a.lastIp || a.ip || "—"}</td>
                  <td
                    className="py-2 truncate max-w-[360px]"
                    title={a.userAgent}
                  >
                    {a.userAgent || ""}
                  </td>
                </tr>
              ))}
              {!activations.length && (
                <tr>
                  <td className="py-3 opacity-70" colSpan={5}>
                    No devices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th className="py-2">Time</th>
                <th className="py-2">Type</th>
                <th className="py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-t">
                  <td className="py-2">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2">{l.type}</td>
                  <td className="py-2">{l.message || ""}</td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td className="py-3 opacity-70" colSpan={3}>
                    No activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
