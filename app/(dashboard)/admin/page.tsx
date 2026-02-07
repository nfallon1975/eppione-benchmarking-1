"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  company: {
    name: string;
    country: string;
    employeeCount: number;
  } | null;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchUsers();
  }, [session, router]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(userId: string, status: "APPROVED" | "REJECTED") {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  const pendingCount = users.filter((u) => u.status === "PENDING").length;
  const approvedCount = users.filter((u) => u.status === "APPROVED").length;
  const totalCompanies = new Set(
    users.filter((u) => u.company).map((u) => u.company!.name)
  ).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
        <p className="mt-1 text-slate-500">Manage users and approvals</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Approvals</CardDescription>
            <CardTitle className="text-2xl">{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Clock className="h-4 w-4" />
              Awaiting review
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved Users</CardDescription>
            <CardTitle className="text-2xl">{approvedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Active accounts
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Companies</CardDescription>
            <CardTitle className="text-2xl">{totalCompanies}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500">
              Contributing to benchmarking
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Review and approve user registrations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name ?? "—"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.company?.name ?? "—"}</TableCell>
                  <TableCell>{user.company?.country ?? "—"}</TableCell>
                  <TableCell>{user.company?.employeeCount ?? "—"}</TableCell>
                  <TableCell>
                    {user.status === "PENDING" && (
                      <Badge variant="warning">Pending</Badge>
                    )}
                    {user.status === "APPROVED" && (
                      <Badge variant="success">Approved</Badge>
                    )}
                    {user.status === "REJECTED" && (
                      <Badge variant="destructive">Rejected</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {user.status === "PENDING" && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600"
                          onClick={() => updateStatus(user.id, "APPROVED")}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => updateStatus(user.id, "REJECTED")}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {user.status === "REJECTED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(user.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                    )}
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
