"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LicenseUsage {
  licenseKey: string;
  teacherName: string;
  teacherEmail: string;
  uploadCount: number;
  uploadLimit: number;
  remaining: number;
  usagePercentage: number;
  status: string;
  classesCount: number;
  testsPerTerm: number;
}

interface OverallStats {
  totalUploads: number;
  totalLimit: number;
  totalLicenses: number;
  activeLicenses: number;
  suspendedLicenses: number;
  averageUsagePercentage: number;
}

export default function UsageDashboard() {
  const [licenses, setLicenses] = useState<LicenseUsage[]>([]);
  const [filteredLicenses, setFilteredLicenses] = useState<LicenseUsage[]>([]);
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"usage" | "remaining" | "name">("usage");

  const filterAndSort = useCallback(() => {
    let filtered = licenses;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = licenses.filter(
        (l) =>
          l.teacherName.toLowerCase().includes(query) ||
          l.teacherEmail.toLowerCase().includes(query) ||
          l.licenseKey.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "usage") {
        return b.usagePercentage - a.usagePercentage;
      } else if (sortBy === "remaining") {
        return a.remaining - b.remaining;
      } else {
        return a.teacherName.localeCompare(b.teacherName);
      }
    });

    setFilteredLicenses(filtered);
  }, [searchQuery, licenses, sortBy]);

  useEffect(() => {
    loadUsageStats();
  }, []);

  useEffect(() => {
    filterAndSort();
  }, [filterAndSort]);

  const loadUsageStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/usage", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setLicenses(data.licenses || []);
        setOverall(data.overall || null);
      }
    } catch (error) {
      console.error("Failed to load usage stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, usagePercentage: number) => {
    if (status === "suspended") {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (usagePercentage >= 90) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (usagePercentage >= 70) {
      return <Badge className="bg-yellow-500">Warning</Badge>;
    }
    return <Badge variant="secondary">Active</Badge>;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return <div className="p-6">Loading usage statistics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Usage Statistics</h1>
        <Button onClick={loadUsageStats} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Overall Statistics Cards */}
      {overall && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Uploads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overall.totalUploads.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">
                of {overall.totalLimit.toLocaleString()} limit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Licenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {overall.activeLicenses}
              </div>
              <p className="text-xs text-gray-500">
                of {overall.totalLicenses} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Suspended Licenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {overall.suspendedLicenses}
              </div>
              <p className="text-xs text-gray-500">
                {(
                  (overall.suspendedLicenses / overall.totalLicenses) *
                  100
                ).toFixed(1)}
                % of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overall.averageUsagePercentage}%
              </div>
              <Progress
                value={overall.averageUsagePercentage}
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search by name, email, or license key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as any)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usage">Sort by Usage %</SelectItem>
                <SelectItem value="remaining">Sort by Remaining</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            License Usage Details ({filteredLicenses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>License Key</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLicenses.map((license) => (
                <TableRow key={license.licenseKey}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{license.teacherName}</div>
                      <div className="text-sm text-gray-500">
                        {license.teacherEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {license.licenseKey}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{license.classesCount} classes</div>
                      <div className="text-gray-500">
                        {license.testsPerTerm} tests/term
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{license.uploadCount}</span>
                      {" / "}
                      <span className="text-gray-500">
                        {license.uploadLimit}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {license.usagePercentage}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <Progress
                      value={license.usagePercentage}
                      className={`w-24 ${getProgressColor(
                        license.usagePercentage
                      )}`}
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-medium ${
                        license.remaining <= 3
                          ? "text-red-600"
                          : license.remaining <= 10
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {license.remaining}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(license.status, license.usagePercentage)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
