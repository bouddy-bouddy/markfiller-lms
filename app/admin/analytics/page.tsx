"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

type SeriesPoint = { _id: string; count: number };

type Event = {
  _id: string;
  type: string;
  message?: string;
  createdAt: string;
};

export default function AnalyticsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [charts, setCharts] = useState<{
    days: number;
    activationsSeries: SeriesPoint[];
    validationsSeries: SeriesPoint[];
    createdSeries: SeriesPoint[];
  } | null>(null);

  async function load() {
    const res = await fetch("/api/analytics", { credentials: "include" });
    const data = await res.json();
    if (res.ok) {
      setEvents(data.events || []);
      setSummary(data.summary || null);
      setCharts(data.charts || null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = events.filter((e) =>
    search
      ? (e.type + (e.message || ""))
          .toLowerCase()
          .includes(search.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard title="Total Licenses" value={summary.totalLicenses} />
          <StatCard title="Active" value={summary.activeLicenses} />
          <StatCard title="Suspended" value={summary.suspendedLicenses} />
          <StatCard title="Expired" value={summary.expiredLicenses} />
          <StatCard title="Teachers" value={summary.totalTeachers} />
          <StatCard title="Devices" value={summary.totalActivations} />
          <StatCard title="Activations (7d)" value={summary.activationsLast7} />
          <StatCard title="Validations (7d)" value={summary.validationsLast7} />
        </div>
      )}

      {charts && (
        <Card>
          <CardHeader>
            <CardTitle>Activity (last {charts.days} days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartLines
              series={[
                {
                  label: "Activations",
                  color: "#2563eb",
                  points: charts.activationsSeries,
                },
                {
                  label: "Validations",
                  color: "#10b981",
                  points: charts.validationsSeries,
                },
                {
                  label: "Licenses Created",
                  color: "#f59e0b",
                  points: charts.createdSeries,
                },
              ]}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Filter events"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map((e) => (
            <div
              key={e._id}
              className="border rounded p-3 text-sm flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{e.type}</div>
                {e.message ? (
                  <div className="opacity-80">{e.message}</div>
                ) : null}
              </div>
              <div className="opacity-60 text-xs">
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="opacity-60 text-sm">No events</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function ChartLines({
  series,
}: {
  series: { label: string; color: string; points: SeriesPoint[] }[];
}) {
  const days = Array.from(
    new Set(series.flatMap((s) => s.points.map((p) => p._id)))
  ).sort();
  const width = 800;
  const height = 280;
  const padding = 32;
  const xScale = (d: string) => {
    const i = days.indexOf(d);
    return padding + (i * (width - padding * 2)) / Math.max(days.length - 1, 1);
  };
  const maxY = Math.max(
    1,
    ...series.flatMap((s) => s.points.map((p) => p.count))
  );
  const yScale = (v: number) =>
    height - padding - (v * (height - padding * 2)) / maxY;

  function pathFor(points: SeriesPoint[]) {
    const map = new Map(points.map((p) => [p._id, p.count] as const));
    const pts = days.map((d) => ({ x: xScale(d), y: yScale(map.get(d) || 0) }));
    return pts
      .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
      .join(" ");
  }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="min-w-[800px]">
        {/* Axes */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#e5e7eb"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="#e5e7eb"
        />
        {/* Labels */}
        {days.map((d) => (
          <text
            key={d}
            x={xScale(d)}
            y={height - padding + 16}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {d.slice(5)}
          </text>
        ))}
        {/* Lines */}
        {series.map((s) => (
          <path
            key={s.label}
            d={pathFor(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
          />
        ))}
        {/* Legend */}
        {series.map((s, idx) => (
          <g
            key={s.label}
            transform={`translate(${padding + idx * 160}, ${padding - 12})`}
          >
            <rect width="12" height="12" fill={s.color} rx="2" />
            <text x="16" y="11" fontSize="12" fill="#374151">
              {s.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
