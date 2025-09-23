"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Summary = {
  totalLicenses: number;
  activeLicenses: number;
  suspendedLicenses: number;
  expiredLicenses: number;
  totalTeachers: number;
  totalActivations: number;
  activationsLast7: number;
  validationsLast7: number;
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setEvents(data.events || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-2xl font-semibold">Dashboard</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard title="Total Licenses" value={summary?.totalLicenses} />
        <StatCard title="Active" value={summary?.activeLicenses} />
        <StatCard title="Suspended" value={summary?.suspendedLicenses} />
        <StatCard title="Expired" value={summary?.expiredLicenses} />
        <StatCard title="Teachers" value={summary?.totalTeachers} />
        <StatCard title="Devices" value={summary?.totalActivations} />
        <StatCard title="Activations (7d)" value={summary?.activationsLast7} />
        <StatCard title="Validations (7d)" value={summary?.validationsLast7} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
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
              {events.map((e) => (
                <tr key={e._id} className="border-t">
                  <td className="py-2">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2">{e.type}</td>
                  <td className="py-2">{e.message || ""}</td>
                </tr>
              ))}
              {!events.length && (
                <tr>
                  <td className="py-3 opacity-70" colSpan={3}>
                    {loading ? "Loading..." : "No recent activity."}
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

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number | undefined;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">
        {value ?? "—"}
      </CardContent>
    </Card>
  );
}
