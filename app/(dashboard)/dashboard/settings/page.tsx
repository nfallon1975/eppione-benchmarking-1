"use client";

import { useEffect, useState, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert, Users, Loader2, Key, FileText, Download, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { COUNTRY_LABELS } from "@/lib/utils";

interface BrokerRelationship {
  id: string;
  status: "ACTIVE" | "INVITED";
  accessLevel: string;
  invitedAt: string;
  acceptedAt: string | null;
  brokerName: string | null;
  brokerEmail: string;
  brokerFirm: string | null;
  countries: string[];
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [brokers, setBrokers] = useState<BrokerRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<BrokerRelationship | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        signOut({ callbackUrl: "/login" });
      } else {
        setDeleteError(data.error || "Failed to delete account");
      }
    } catch {
      setDeleteError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  const fetchBrokers = useCallback(async () => {
    try {
      const res = await fetch("/api/clients/brokers");
      if (res.ok) {
        setBrokers(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch brokers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return; // wait for session to load
    if (session.user?.role !== "CLIENT" && session.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }
    fetchBrokers();
  }, [session, router, fetchBrokers]);

  async function handleRevoke() {
    if (!confirmRevoke) return;
    setRevoking(confirmRevoke.id);
    try {
      const res = await fetch("/api/clients/brokers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipId: confirmRevoke.id }),
      });
      if (res.ok) {
        setBrokers((prev) => prev.filter((b) => b.id !== confirmRevoke.id));
      }
    } catch (err) {
      console.error("Failed to revoke:", err);
    } finally {
      setRevoking(null);
      setConfirmRevoke(null);
    }
  }

  const activeBrokers = brokers.filter((b) => b.status === "ACTIVE");
  const pendingInvites = brokers.filter((b) => b.status === "INVITED");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-slate-500">Manage your account and data access permissions</p>
      </div>

      {/* Broker Access Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Broker Access
          </CardTitle>
          <CardDescription>
            Brokers with access can view your benchmarking data and compliance status.
            You can revoke access at any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brokers.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No broker access</p>
              <p className="mt-1 text-sm text-slate-500">
                No brokers currently have access to your data.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broker Name</TableHead>
                  <TableHead>Firm</TableHead>
                  <TableHead>Countries</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Access Granted</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBrokers.map((broker) => (
                  <TableRow key={broker.id}>
                    <TableCell className="font-medium">
                      {broker.brokerName || broker.brokerEmail}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {broker.brokerFirm || "—"}
                    </TableCell>
                    <TableCell>
                      {broker.countries.length === 0 ? (
                        <span className="text-sm text-slate-500">All Countries</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {broker.countries.map((code) => (
                            <Badge key={code} variant="outline" className="text-xs">
                              {COUNTRY_LABELS[code] || code}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Active</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {broker.acceptedAt
                        ? new Date(broker.acceptedAt).toLocaleDateString("en-IE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : new Date(broker.invitedAt).toLocaleDateString("en-IE", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {broker.accessLevel === "VIEW_AND_ADVISE"
                          ? "View & Advise"
                          : "View Only"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setConfirmRevoke(broker)}
                      >
                        Revoke Access
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingInvites.map((broker) => (
                  <TableRow key={broker.id}>
                    <TableCell className="font-medium text-slate-500">
                      {broker.brokerName || broker.brokerEmail}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {broker.brokerFirm || "—"}
                    </TableCell>
                    <TableCell>
                      {broker.countries.length === 0 ? (
                        <span className="text-sm text-slate-400">All Countries</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {broker.countries.map((code) => (
                            <Badge key={code} variant="outline" className="text-xs">
                              {COUNTRY_LABELS[code] || code}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning">Pending Invite</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {new Date(broker.invitedAt).toLocaleDateString("en-IE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {broker.accessLevel === "VIEW_AND_ADVISE"
                          ? "View & Advise"
                          : "View Only"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setConfirmRevoke(broker)}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Generate API keys for programmatic access to your benefit data from external HR platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/dashboard/settings/api-keys"
            className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Key className="h-4 w-4" />
            Manage API Keys
          </Link>
        </CardContent>
      </Card>

      {/* API Documentation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            API Documentation
          </CardTitle>
          <CardDescription>
            Reference documentation for integrating external HR and benefits platforms with Eppione.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/api-docs"
            className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <FileText className="h-4 w-4" />
            View API Documentation
          </Link>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!confirmRevoke} onOpenChange={(open) => !open && setConfirmRevoke(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke Broker Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access for{" "}
              <span className="font-medium text-slate-900">
                {confirmRevoke?.brokerName || confirmRevoke?.brokerEmail}
              </span>
              {confirmRevoke?.brokerFirm && (
                <>
                  {" "}from <span className="font-medium text-slate-900">{confirmRevoke.brokerFirm}</span>
                </>
              )}
              ? They will no longer be able to view your benchmarking data or compliance status.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmRevoke(null)}
              disabled={!!revoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={!!revoking}
            >
              {revoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Access"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Data & Privacy Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Data & Privacy
          </CardTitle>
          <CardDescription>
            Export your data or delete your account in accordance with GDPR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">Export Your Data</p>
              <p className="text-xs text-slate-500">Download all your company and benefits data as JSON. Limited to once per day.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.href = "/api/auth/data-export";
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50/50 p-4">
            <div>
              <p className="text-sm font-medium text-red-800">Delete Account</p>
              <p className="text-xs text-red-600">Permanently delete your account and all associated data. This cannot be undone.</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteAccount(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Your Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data. Enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{deleteError}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="deletePassword">Password</Label>
            <Input
              id="deletePassword"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowDeleteAccount(false); setDeletePassword(""); setDeleteError(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!deletePassword || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
