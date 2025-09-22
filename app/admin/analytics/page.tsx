"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Event = {
  _id: string;
  type: string;
  message?: string;
  createdAt: string;
};

export default function AnalyticsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");

  async function load() {
    const res = await fetch("/api/analytics", { credentials: "include" });
    const data = await res.json();
    if (res.ok) setEvents(data.events || []);
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
    <div className="space-y-4">
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
