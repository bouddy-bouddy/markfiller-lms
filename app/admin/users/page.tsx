"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AdminUser = {
  _id: string;
  fullName?: string;
  email: string;
  role: "admin" | "support";
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/users?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-2xl font-semibold">User Management</div>
      <Card>
        <CardHeader className="w-full flex-row items-center justify-between">
          <CardTitle>All Users</CardTitle>
          <Button onClick={() => setShowCreate(true)}>New User</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by name or email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="max-w-md"
            />
            <Button onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t">
                    <td className="py-2">{u.fullName || "—"}</td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2 capitalize">{u.role}</td>
                    <td className="py-2">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2">
                      <UserRowActions user={u} onChanged={load} />
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td className="py-3 opacity-70" colSpan={5}>
                      No users.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showCreate && (
        <CreateUserDialog
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}

function CreateUserDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "support">("admin");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullName, email, password, role }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({} as any));
        throw new Error(e.error || "Failed to create user");
      }
      onCreated();
      onClose();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b text-lg font-semibold">
          Create New User
        </div>
        <div className="p-4 space-y-3">
          <div>
            <div className="text-sm mb-1">Full Name</div>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <div className="text-sm mb-1">Email</div>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
            />
          </div>
          <div>
            <div className="text-sm mb-1">Password</div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>
          <div>
            <div className="text-sm mb-1">Role</div>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="p-4 border-t flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Creating..." : "Create User"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserRowActions({
  user,
  onChanged,
}: {
  user: AdminUser;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<"admin" | "support">(user.role);
  const [password, setPassword] = useState("");

  async function remove() {
    if (!confirm("Delete this user?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users?id=${user._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: user._id,
          role,
          password: password || undefined,
        }),
      });
      if (res.ok) {
        setPassword("");
        onChanged();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={role} onValueChange={(v) => setRole(v as any)}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Administrator</SelectItem>
          <SelectItem value="support">Support</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="password"
        placeholder="New password"
        className="h-8 text-xs w-40"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button size="sm" onClick={saveChanges} disabled={saving}>
        Save
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={remove}
        disabled={saving}
      >
        Delete
      </Button>
    </div>
  );
}
