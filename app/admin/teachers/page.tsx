"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type TeacherRow = {
  _id: string;
  fullName: string;
  email: string;
  cin?: string;
  createdAt: string;
  licenses: number;
};

export default function TeachersPage() {
  const [rows, setRows] = useState<TeacherRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/teachers?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setRows(data);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="text-2xl font-semibold">Teachers</div>
      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by name, email, or CIN..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="max-w-md"
            />
            <Button onClick={load}>Search</Button>
          </div>
          <Table className="text-sm">
            <TableHeader className="text-left opacity-70">
              <TableRow>
                <TableHead className="py-2">Name</TableHead>
                <TableHead className="py-2">Email</TableHead>
                <TableHead className="py-2">CIN</TableHead>
                <TableHead className="py-2">Licenses</TableHead>
                <TableHead className="py-2">Created</TableHead>
                <TableHead className="py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t._id}>
                  <TableCell className="py-2">{t.fullName}</TableCell>
                  <TableCell className="py-2">{t.email}</TableCell>
                  <TableCell className="py-2">{t.cin || "—"}</TableCell>
                  <TableCell className="py-2">{t.licenses}</TableCell>
                  <TableCell className="py-2">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-2">
                    <TeacherActions teacher={t} onChanged={load} />
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell className="py-3 opacity-70" colSpan={6}>
                    {loading ? "Loading..." : "No teachers."}
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

function TeacherActions({
  teacher,
  onChanged,
}: {
  teacher: TeacherRow;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Edit teacher"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => setConfirmDelete(true)}
        aria-label="Delete teacher"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {open && (
        <EditTeacherModal
          teacher={teacher}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            onChanged();
          }}
        />
      )}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Teacher</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{teacher.fullName}</strong>?<br /> This action cannot be
              undone.
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
                    `/api/admin/teachers?id=${teacher._id}`,
                    {
                      method: "DELETE",
                      credentials: "include",
                    }
                  );
                  if (res.ok) {
                    toast.success(
                      `Teacher "${teacher.fullName}" deleted successfully`
                    );
                    onChanged();
                    setConfirmDelete(false);
                  } else {
                    const errorData = await res.json().catch(() => ({}));
                    toast.error(
                      errorData.error ||
                        `Failed to delete teacher (${res.status})`
                    );
                  }
                } catch (e) {
                  toast.error(
                    `Failed to delete teacher: ${(e as Error).message}`
                  );
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditTeacherModal({
  teacher,
  onClose,
  onSaved,
}: {
  teacher: TeacherRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(teacher.fullName || "");
  const [email, setEmail] = useState(teacher.email);
  const [cin, setCin] = useState(teacher.cin || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: teacher._id,
          fullName,
          email,
          cin,
        }),
      });
      if (!res.ok) {
        const e: { error?: string } = await res
          .json()
          .catch(() => ({ error: undefined }));
        throw new Error(e.error || `Failed to update teacher (${res.status})`);
      }
      toast.success(`Teacher "${fullName || email}" updated successfully`);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-background border rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Edit Teacher</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Teacher's full name"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              type="email"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">CIN</label>
            <Input
              value={cin}
              onChange={(e) => setCin(e.target.value)}
              placeholder="Teacher's CIN"
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
