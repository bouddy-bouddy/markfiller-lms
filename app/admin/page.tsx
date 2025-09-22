"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type License = {
  _id: string;
  key: string;
  status: "active" | "suspended" | "expired";
  validUntil: string;
  allowedDevices: number;
  teacher?: { fullName?: string; email?: string };
};

export default function AdminHome() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const createSchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    allowedDevices: z.number().min(1).max(5).default(1),
  });
  type CreateValues = z.infer<typeof createSchema>;
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { fullName: "", email: "", allowedDevices: 1 },
  });

  async function loadLicenses() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`/api/licenses?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setLicenses(data);
    } finally {
      setLoading(false);
    }
  }

  async function mutate(key: string, next: "active" | "suspended") {
    const res = await fetch("/api/licenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key, status: next }),
    });
    if (res.ok) loadLicenses();
  }

  async function remove(key: string) {
    if (!confirm("Delete this license?")) return;
    const res = await fetch(`/api/licenses?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) loadLicenses();
  }

  useEffect(() => {
    loadLicenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return licenses.filter((l) =>
      status === "all" ? true : l.status === status
    );
  }, [licenses, status]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {licenses.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {licenses.filter((l) => l.status === "active").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {licenses.filter((l) => l.status === "suspended").length}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Licenses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded p-4">
            <div className="font-medium mb-3">Create License</div>
            <Form {...form}>
              <form
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                onSubmit={form.handleSubmit(async (values) => {
                  try {
                    const res = await fetch("/api/licenses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify(values),
                    });
                    if (!res.ok) throw new Error("Failed to create");
                    toast.success(
                      "License created and email sent (if SMTP configured)"
                    );
                    form.reset({ fullName: "", email: "", allowedDevices: 1 });
                    loadLicenses();
                  } catch (e: any) {
                    toast.error(e.message || "Error creating license");
                  }
                })}
              >
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Teacher name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="teacher@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allowedDevices"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowed devices</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="sm:col-span-3">
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </Form>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Search by key/status/email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadLicenses()}
              className="w-64"
            />
            <Button onClick={loadLicenses} disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </Button>
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            {filtered.map((lic) => (
              <div key={lic._id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <span>{lic.key}</span>
                      <Badge
                        variant={
                          lic.status === "active"
                            ? "success"
                            : lic.status === "suspended"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {lic.status}
                      </Badge>
                    </div>
                    <div className="text-sm opacity-70">
                      {lic.teacher?.fullName} — {lic.teacher?.email}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {lic.status === "active" ? (
                      <Button
                        variant="secondary"
                        onClick={() => mutate(lic.key, "suspended")}
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button onClick={() => mutate(lic.key, "active")}>
                        Activate
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => remove(lic.key)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="text-xs opacity-70 mt-2">
                  valid until {new Date(lic.validUntil).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
