"use client";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";

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
  teacher?: {
    fullName?: string;
    email?: string;
    cin?: string;
    phone?: string;
    level?: "الإعدادي" | "الثانوي";
    subject?: string;
    classesCount?: number;
    testsPerTerm?: number;
  };
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    cin: "",
    phone: "",
    level: "" as "الإعدادي" | "الثانوي" | "",
    subject: "",
    classesCount: "",
    testsPerTerm: "",
    allowedDevices: 1,
    status: "active" as "active" | "suspended",
  });

  // Extend form state
  const [extendForm, setExtendForm] = useState({
    newExpirationDate: "",
  });
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

        // Populate edit form with current data
        if (data.license) {
          setEditForm({
            fullName: data.license.teacher?.fullName || "",
            email: data.license.teacher?.email || "",
            cin: data.license.teacher?.cin || "",
            phone: data.license.teacher?.phone || "",
            level: data.license.teacher?.level || "",
            subject: data.license.teacher?.subject || "",
            classesCount: data.license.teacher?.classesCount?.toString() || "",
            testsPerTerm: data.license.teacher?.testsPerTerm?.toString() || "",
            allowedDevices: data.license.allowedDevices || 1,
            status: data.license.status || "active",
          });

          // Pre-populate extend form with current expiration date
          setExtendForm({
            newExpirationDate: new Date(data.license.validUntil)
              .toISOString()
              .split("T")[0],
          });
        }
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
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            Edit
          </Button>
          <Button variant="secondary" onClick={() => setExtendDialogOpen(true)}>
            Extend
          </Button>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete License</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this license?
              <br /> This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  const res = await fetch(
                    `/api/licenses?key=${encodeURIComponent(key)}`,
                    {
                      method: "DELETE",
                      credentials: "include",
                    }
                  );
                  if (res.ok) {
                    toast.success("License deleted successfully");
                    setConfirmDelete(false);
                    window.location.href = "/admin";
                  } else {
                    const errorData = await res.json().catch(() => ({}));
                    toast.error(
                      errorData.error ||
                        `Failed to delete license (${res.status})`
                    );
                  }
                } catch (e) {
                  toast.error(
                    `Failed to delete license: ${(e as Error).message}`
                  );
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <CardTitle className="text-base">Teacher Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs opacity-70">Level</div>
              <div className="mt-1 font-medium">
                {license.teacher?.level || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">Subject Taught</div>
              <div className="mt-1 font-medium">
                {license.teacher?.subject || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">Classes Count</div>
              <div className="mt-1 font-medium">
                {license.teacher?.classesCount || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">Tests per Term</div>
              <div className="mt-1 font-medium">
                {license.teacher?.testsPerTerm || "—"}
              </div>
            </div>
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

      {/* Edit License Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit License</DialogTitle>
            <DialogDescription>
              Update the license and teacher information. Click save when
              you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={editForm.fullName}
                onChange={(e) =>
                  setEditForm({ ...editForm, fullName: e.target.value })
                }
                placeholder="Teacher's full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="teacher@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cin">National ID</Label>
              <Input
                id="cin"
                value={editForm.cin}
                onChange={(e) =>
                  setEditForm({ ...editForm, cin: e.target.value })
                }
                placeholder="National ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select
                value={editForm.level}
                onValueChange={(value) =>
                  setEditForm({
                    ...editForm,
                    level: value as "الإعدادي" | "الثانوي",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="الإعدادي">الإعدادي</SelectItem>
                  <SelectItem value="الثانوي">الثانوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Taught</Label>
              <Input
                id="subject"
                value={editForm.subject}
                onChange={(e) =>
                  setEditForm({ ...editForm, subject: e.target.value })
                }
                placeholder="Subject taught"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classesCount">Classes Count</Label>
              <Input
                id="classesCount"
                type="number"
                value={editForm.classesCount}
                onChange={(e) =>
                  setEditForm({ ...editForm, classesCount: e.target.value })
                }
                placeholder="Number of classes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testsPerTerm">Tests per Term</Label>
              <Input
                id="testsPerTerm"
                type="number"
                value={editForm.testsPerTerm}
                onChange={(e) =>
                  setEditForm({ ...editForm, testsPerTerm: e.target.value })
                }
                placeholder="Tests per term"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowedDevices">Maximum Devices</Label>
              <Select
                value={editForm.allowedDevices.toString()}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, allowedDevices: parseInt(value) })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 device</SelectItem>
                  <SelectItem value="2">2 devices</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm({
                    ...editForm,
                    status: value as "active" | "suspended",
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await fetch(
                    `/api/licenses/${encodeURIComponent(key)}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        teacher: {
                          fullName: editForm.fullName,
                          email: editForm.email,
                          cin: editForm.cin,
                          phone: editForm.phone,
                          level: editForm.level || undefined,
                          subject: editForm.subject,
                          classesCount: editForm.classesCount
                            ? parseInt(editForm.classesCount)
                            : undefined,
                          testsPerTerm: editForm.testsPerTerm
                            ? parseInt(editForm.testsPerTerm)
                            : undefined,
                        },
                        allowedDevices: editForm.allowedDevices,
                        status: editForm.status,
                      }),
                    }
                  );
                  if (res.ok) {
                    toast.success("License updated successfully");
                    setEditDialogOpen(false);
                    // Reload the page data
                    window.location.reload();
                  } else {
                    const errorData = await res.json().catch(() => ({}));
                    toast.error(errorData.error || "Failed to update license");
                  }
                } catch (e) {
                  toast.error(
                    `Failed to update license: ${(e as Error).message}`
                  );
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend License Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend License</DialogTitle>
            <DialogDescription>
              Set a new expiration date for this license.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="newExpirationDate">New Expiration Date</Label>
              <Input
                id="newExpirationDate"
                type="date"
                value={extendForm.newExpirationDate}
                onChange={(e) =>
                  setExtendForm({
                    ...extendForm,
                    newExpirationDate: e.target.value,
                  })
                }
                min={new Date(license.validUntil).toISOString().split("T")[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!extendForm.newExpirationDate) {
                  toast.error("Please select a new expiration date");
                  return;
                }

                const newDate = new Date(extendForm.newExpirationDate);
                const currentExpiration = new Date(license.validUntil);

                if (newDate <= currentExpiration) {
                  toast.error(
                    "New expiration date must be after the current expiration date"
                  );
                  return;
                }

                setSaving(true);
                try {
                  const res = await fetch(
                    `/api/licenses/${encodeURIComponent(key)}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        validUntil: new Date(
                          extendForm.newExpirationDate
                        ).toISOString(),
                      }),
                    }
                  );
                  if (res.ok) {
                    toast.success("License extended successfully");
                    setExtendDialogOpen(false);
                    // Reload the page data
                    window.location.reload();
                  } else {
                    const errorData = await res.json().catch(() => ({}));
                    toast.error(errorData.error || "Failed to extend license");
                  }
                } catch (e) {
                  toast.error(
                    `Failed to extend license: ${(e as Error).message}`
                  );
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? "Extending..." : "Extend License"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
