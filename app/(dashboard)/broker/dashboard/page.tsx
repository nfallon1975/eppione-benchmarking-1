"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileCheck, CheckCircle2, Clock, UserPlus, Plus } from "lucide-react";

interface BrokerStats {
  activeClients: number;
  invitedClients: number;
  revokedClients: number;
  totalClients: number;
  complianceContributions: number;
  verifiedContributions: number;
  recentActivity: {
    id: string;
    inviteEmail: string;
    status: string;
    invitedAt: string;
    acceptedAt: string | null;
    clientName: string | null;
    companyName: string | null;
  }[];
}

export default function BrokerDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<BrokerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "BROKER") {
      router.push("/dashboard");
      return;
    }
    fetch("/api/broker/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Broker Dashboard</h1>
        <p className="mt-1 text-slate-500">
          Manage your clients and compliance contributions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Clients</CardDescription>
            <CardTitle className="text-2xl">{stats?.activeClients ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Users className="h-4 w-4" />
              Connected
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Invites</CardDescription>
            <CardTitle className="text-2xl">{stats?.invitedClients ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <Clock className="h-4 w-4" />
              Awaiting response
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Compliance Items</CardDescription>
            <CardTitle className="text-2xl">{stats?.complianceContributions ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FileCheck className="h-4 w-4" />
              Contributed
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Verified Items</CardDescription>
            <CardTitle className="text-2xl">{stats?.verifiedContributions ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Admin verified
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href="/broker/clients">
              <Button className="w-full justify-start gap-2">
                <UserPlus className="h-4 w-4" />
                Invite a Client
              </Button>
            </Link>
            <Link href="/broker/compliance">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                Add Compliance Data
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest client interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.recentActivity?.length ? (
              <p className="text-sm text-slate-500">No activity yet. Start by inviting a client.</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {item.companyName || item.inviteEmail}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(item.invitedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.status === "ACTIVE"
                          ? "success"
                          : item.status === "INVITED"
                            ? "warning"
                            : "destructive"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
