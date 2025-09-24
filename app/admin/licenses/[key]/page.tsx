"use client";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
          <Table className="text-sm">
            <TableHeader className="text-left opacity-70">
              <TableRow>
                <TableHead className="py-2">Device ID</TableHead>
                <TableHead className="py-2">Activated</TableHead>
                <TableHead className="py-2">Last Seen</TableHead>
                <TableHead className="py-2">IP</TableHead>
                <TableHead className="py-2">User Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activations.map((a) => (
                <TableRow key={a._id}>
                  <TableCell className="py-2 font-mono text-xs break-all">
                    {a.deviceId}
                  </TableCell>
                  <TableCell className="py-2">
                    {new Date(a.activatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="py-2">
                    {a.lastSeenAt
                      ? new Date(a.lastSeenAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="py-2">
                    {a.lastIp || a.ip || "—"}
                  </TableCell>
                  <TableCell
                    className="py-2 truncate max-w-[360px]"
                    title={a.userAgent}
                  >
                    {a.userAgent || ""}
                  </TableCell>
                </TableRow>
              ))}
              {!activations.length && (
                <TableRow>
                  <TableCell className="py-3 opacity-70" colSpan={5}>
                    No devices yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader className="text-left opacity-70">
              <TableRow>
                <TableHead className="py-2">Time</TableHead>
                <TableHead className="py-2">Type</TableHead>
                <TableHead className="py-2">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l._id}>
                  <TableCell className="py-2">
                    {new Date(l.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="py-2">{l.type}</TableCell>
                  <TableCell className="py-2">{l.message || ""}</TableCell>
                </TableRow>
              ))}
              {!logs.length && (
                <TableRow>
                  <TableCell className="py-3 opacity-70" colSpan={3}>
                    No activity yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
