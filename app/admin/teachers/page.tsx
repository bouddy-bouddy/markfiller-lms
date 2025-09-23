"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, []);

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">CIN</th>
                  <th className="py-2">Licenses</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t._id} className="border-t">
                    <td className="py-2">{t.fullName}</td>
                    <td className="py-2">{t.email}</td>
                    <td className="py-2">{t.cin || "—"}</td>
                    <td className="py-2">{t.licenses}</td>
                    <td className="py-2">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td className="py-3 opacity-70" colSpan={5}>
                      {loading ? "Loading..." : "No teachers."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
