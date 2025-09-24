"use client";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock } from "lucide-react";

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
  createdAt?: string;
  teacher?: { fullName?: string; email?: string; cin?: string; phone?: string };
};

export default function LicenseDetails({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const [license, setLicense] = useState<License | null>(null);
  const [activations, setActivations] = useState<Activation[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => history.back()}>
            Back
          </Button>
          <div className="text-xl font-semibold">License Details</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => alert("Edit not implemented yet")}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            onClick={() => alert("Extend not implemented yet")}
          >
            Extend
          </Button>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>
      {confirmDelete &&
        createPortal(
          <Alert
            variant="destructive"
            className="fixed bottom-4 right-4 z-50 w-[360px] shadow-lg"
          >
            <AlertTitle>Delete this license?</AlertTitle>
            <AlertDescription className="mt-2 flex items-center justify-between gap-2">
              <span>This action cannot be undone.</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    const res = await fetch(
                      `/api/licenses?key=${encodeURIComponent(key)}`,
                      {
                        method: "DELETE",
                        credentials: "include",
                      }
                    );
                    if (res.ok) {
                      setConfirmDelete(false);
                      window.location.href = "/admin";
                    }
                  }}
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>,
          document.body
        )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">License Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2">
              <div className="text-xs opacity-70">License Key</div>
              <div className="mt-1 rounded-md bg-muted px-3 py-2 font-medium break-all">
                {license.key}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">Status</div>
              <div className="mt-1">
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
            </div>
            <div>
              <div className="text-xs opacity-70">Max Devices</div>
              <div className="mt-1 font-medium">{license.allowedDevices}</div>
            </div>
            <div>
              <div className="text-xs opacity-70">Created</div>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <Clock className="h-4 w-4 opacity-70" />
                {license.createdAt
                  ? new Date(license.createdAt).toLocaleDateString()
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">Expires</div>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <Calendar className="h-4 w-4 opacity-70" />
                {new Date(license.validUntil).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">User Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <div className="text-xs opacity-70">Full Name</div>
              <div className="font-medium">
                {license.teacher?.fullName || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">National ID</div>
              <div className="font-medium">{license.teacher?.cin || "—"}</div>
            </div>
            <div>
              <div className="text-xs opacity-70">Email</div>
              <div className="font-medium break-all">
                {license.teacher?.email || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">Phone Number</div>
              <div className="font-medium">{license.teacher?.phone || "—"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Customer Identification Number
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="text-xs opacity-70">National ID</div>
            <div className="font-medium">{license.teacher?.cin || "—"}</div>
          </CardContent>
        </Card>
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
