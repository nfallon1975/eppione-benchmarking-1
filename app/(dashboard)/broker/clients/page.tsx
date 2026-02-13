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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientInviteDialog } from "@/components/broker/client-invite-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRY_LABELS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Upload, Send, Loader2, Trash2, UserCog } from "lucide-react";

interface BrokerClient {
  id: string;
  companyId: string | null;
  inviteEmail: string;
  status: string;
  accessLevel: string;
  invitedAt: string;
  acceptedAt: string | null;
  company: {
    id: string;
    name: string;
    country: string;
    employeeCount: number;
  } | null;
  countries: string[];
}

export default function BrokerClientsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<BrokerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrokerClient | null>(null);
  const [deleteMode, setDeleteMode] = useState<"anonymize" | "full">("anonymize");
  const [deleting, setDeleting] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<BrokerClient | null>(null);
  const [replaceName, setReplaceName] = useState("");
  const [replaceEmail, setReplaceEmail] = useState("");
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    if (session?.user?.role !== "BROKER") {
      router.push("/dashboard");
      return;
    }
    fetchClients();
  }, [session, router]);

  async function fetchClients() {
    try {
      const res = await fetch("/api/broker/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(clientId: string, email: string) {
    setInvitingId(clientId);
    try {
      const res = await fetch("/api/broker/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        await fetchClients();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send invite");
      }
    } catch {
      alert("Failed to send invite");
    } finally {
      setInvitingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget?.company?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/broker/clients/${deleteTarget.company.id}?mode=${deleteMode}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteTarget(null);
        fetchClients();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete client");
      }
    } catch {
      alert("Failed to delete client");
    } finally {
      setDeleting(false);
    }
  }

  async function handleReplaceContact() {
    if (!replaceTarget?.company?.id) return;
    setReplacing(true);
    try {
      const res = await fetch(
        `/api/broker/clients/${replaceTarget.company.id}/replace-contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: replaceName, email: replaceEmail }),
        }
      );
      if (res.ok) {
        setReplaceTarget(null);
        setReplaceName("");
        setReplaceEmail("");
        fetchClients();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to replace contact");
      }
    } catch {
      alert("Failed to replace contact");
    } finally {
      setReplacing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Clients</h1>
          <p className="mt-1 text-slate-500">
            Manage your client relationships and invitations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/broker/upload")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Clients via CSV
          </Button>
          <ClientInviteDialog onInvited={fetchClients} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Relationships</CardTitle>
          <CardDescription>
            {clients.length} total relationship{clients.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Countries</TableHead>
                <TableHead>Access Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-slate-500 py-8">
                    No clients yet. Use the &quot;Invite a Client&quot; button to get started.
                  </TableCell>
                </TableRow>
              )}
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  className={
                    client.status === "ACTIVE" ? "cursor-pointer hover:bg-slate-50" : ""
                  }
                  onClick={() => {
                    if (client.status === "ACTIVE" && client.company?.id) {
                      router.push(`/broker/clients/${client.company.id}`);
                    }
                  }}
                >
                  <TableCell className="font-medium">
                    {client.company?.name || "—"}
                  </TableCell>
                  <TableCell>{client.inviteEmail}</TableCell>
                  <TableCell>
                    {client.countries.length === 0 ? (
                      <span className="text-sm text-slate-500">All Countries</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {client.countries.map((code) => (
                          <Badge key={code} variant="outline" className="text-xs">
                            {COUNTRY_LABELS[code] || code}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {client.accessLevel === "VIEW_AND_ADVISE" ? "View & Advise" : "View Only"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        client.status === "ACTIVE"
                          ? "success"
                          : client.status === "INVITED"
                            ? "warning"
                            : client.status === "UPLOADED"
                              ? "secondary"
                              : "destructive"
                      }
                    >
                      {client.status === "UPLOADED" ? "Uploaded" : client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {client.acceptedAt
                      ? new Date(client.acceptedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {client.status === "ACTIVE" && client.company?.id && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-eppione-cyan">
                          View Benchmarks →
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteMode("anonymize");
                            setDeleteTarget(client);
                          }}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplaceName("");
                            setReplaceEmail("");
                            setReplaceTarget(client);
                          }}
                        >
                          <UserCog className="mr-1 h-3 w-3" />
                          Replace
                        </Button>
                      </div>
                    )}
                    {client.status === "UPLOADED" && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInvite(client.id, client.inviteEmail);
                        }}
                        disabled={invitingId === client.id}
                      >
                        {invitingId === client.id ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-3 w-3" />
                        )}
                        Invite
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Client Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              {deleteTarget?.company?.name} ({deleteTarget?.inviteEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <input
                type="radio"
                name="deleteMode"
                checked={deleteMode === "anonymize"}
                onChange={() => setDeleteMode("anonymize")}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-sm">Remove personal data only</div>
                <div className="text-xs text-slate-500">
                  Keep anonymized benefits data for benchmarking
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
              <input
                type="radio"
                name="deleteMode"
                checked={deleteMode === "full"}
                onChange={() => setDeleteMode("full")}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-sm">Delete all data permanently</div>
                <div className="text-xs text-slate-500">
                  Remove company, benefits, and all associated data
                </div>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteMode === "anonymize" ? "Anonymize" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Contact Dialog */}
      <Dialog open={!!replaceTarget} onOpenChange={(open) => !open && setReplaceTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace Contact</DialogTitle>
            <DialogDescription>
              Replace the contact person for {replaceTarget?.company?.name}.
              The new user will sign in via magic link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="broker-replace-name">Name</Label>
              <Input
                id="broker-replace-name"
                placeholder="Full name"
                value={replaceName}
                onChange={(e) => setReplaceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="broker-replace-email">Email</Label>
              <Input
                id="broker-replace-email"
                type="email"
                placeholder="email@company.com"
                value={replaceEmail}
                onChange={(e) => setReplaceEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReplaceContact}
              disabled={replacing || !replaceName.trim() || !replaceEmail.trim()}
            >
              {replacing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Replace Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
