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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const createSchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    cin: z.string().min(3),
    phone: z.string().min(6),
    level: z.enum(["الإعدادي", "الثانوي"]),
    subject: z.string().min(2),
    classesCount: z.number().min(1),
    testsPerTerm: z.number().min(1),
    allowedDevices: z.number().min(1).max(2).default(1),
    monthsValid: z.number().min(1).default(10),
  });
  type CreateValues = z.input<typeof createSchema>;
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      fullName: "",
      email: "",
      cin: "",
      phone: "",
      level: "الإعدادي",
      subject: "",
      classesCount: 1,
      testsPerTerm: 1,
      allowedDevices: 1,
      monthsValid: 10,
    },
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
    try {
      const res = await fetch("/api/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key, status: next }),
      });
      if (res.ok) {
        toast.success(
          `License ${
            next === "active" ? "activated" : "suspended"
          } successfully`
        );
        loadLicenses();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(
          errorData.error ||
            `Failed to ${next === "active" ? "activate" : "suspend"} license (${
              res.status
            })`
        );
      }
    } catch (e) {
      toast.error(
        `Failed to ${next === "active" ? "activate" : "suspend"} license: ${
          (e as Error).message
        }`
      );
    }
  }

  async function remove(key: string) {
    try {
      const res = await fetch(`/api/licenses?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("License deleted successfully");
        loadLicenses();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(
          errorData.error || `Failed to delete license (${res.status})`
        );
      }
    } catch (e) {
      toast.error(`Failed to delete license: ${(e as Error).message}`);
    }
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Licenses</CardTitle>
          <Button onClick={() => setCreateOpen(true)}>Create License</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create License</DialogTitle>
                <DialogDescription>
                  Fill in all required fields to create and email the license.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  onSubmit={form.handleSubmit(async (values) => {
                    setCreating(true);
                    try {
                      const res = await fetch("/api/licenses", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify(values),
                      });
                      if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(
                          errorData.error ||
                            `Failed to create license (${res.status})`
                        );
                      }
                      toast.success(
                        "License created and email sent successfully"
                      );
                      form.reset({
                        fullName: "",
                        email: "",
                        cin: "",
                        phone: "",
                        level: "الإعدادي",
                        subject: "",
                        classesCount: 1,
                        testsPerTerm: 1,
                        allowedDevices: 1,
                        monthsValid: 10,
                      });
                      setCreateOpen(false);
                      loadLicenses();
                    } catch (e) {
                      toast.error(
                        (e as Error).message || "Error creating license"
                      );
                    } finally {
                      setCreating(false);
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
                    name="cin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CIN</FormLabel>
                        <FormControl>
                          <Input placeholder="ID Card Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="الإعدادي">الإعدادي</SelectItem>
                            <SelectItem value="الثانوي">الثانوي</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="الرياضيات">الرياضيات</SelectItem>
                            <SelectItem value="الفيزياء والكيمياء">
                              الفيزياء والكيمياء
                            </SelectItem>

                            <SelectItem value="علوم الحياة والأرض">
                              علوم الحياة والأرض
                            </SelectItem>
                            <SelectItem value="اللغة العربية">
                              اللغة العربية
                            </SelectItem>
                            <SelectItem value="اللغة الفرنسية">
                              اللغة الفرنسية
                            </SelectItem>
                            <SelectItem value="اللغة الإنجليزية">
                              اللغة الإنجليزية
                            </SelectItem>
                            <SelectItem value="التاريخ والجغرافيا">
                              التاريخ والجغرافيا
                            </SelectItem>
                            <SelectItem value="التربية الإسلامية">
                              التربية الإسلامية
                            </SelectItem>
                            <SelectItem value="الفلسفة">الفلسفة</SelectItem>
                            <SelectItem value="الاقتصاد">الاقتصاد</SelectItem>
                            <SelectItem value="المحاسبة">المحاسبة</SelectItem>
                            <SelectItem value="الإعلاميات">
                              الإعلاميات
                            </SelectItem>
                            <SelectItem value="التربية البدنية">
                              التربية البدنية
                            </SelectItem>
                            <SelectItem value="الفنون">الفنون</SelectItem>
                            <SelectItem value="الموسيقى">الموسيقى</SelectItem>
                            <SelectItem value="مادة أخرى">مادة أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="classesCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Classes count</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
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
                  <FormField
                    control={form.control}
                    name="testsPerTerm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tests per term</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
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
                            max={2}
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
                  <FormField
                    control={form.control}
                    name="monthsValid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Months valid</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
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
                  <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Search by key/status/email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadLicenses()}
              className="max-w-md"
            />
            <Button onClick={loadLicenses}>Search</Button>
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
            {loading && (
              <p className="text-sm opacity-70">Loading licenses...</p>
            )}
            {!loading &&
              filtered.map((lic) => (
                <div key={lic._id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <a
                          className="underline"
                          href={`/admin/licenses/${encodeURIComponent(
                            lic.key
                          )}`}
                        >
                          {lic.key}
                        </a>
                        <Badge
                          variant={
                            lic.status === "active"
                              ? "secondary"
                              : lic.status === "suspended"
                              ? "destructive"
                              : "outline"
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
                        onClick={() => setPendingDelete(lic.key)}
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
      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this license?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              license and associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!pendingDelete) return;
                await remove(pendingDelete);
                setPendingDelete(null);
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
