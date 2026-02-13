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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Key, Plus, Trash2, Copy, Loader2, CheckCircle2 } from "lucide-react";

interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

const AVAILABLE_SCOPES = [
  { value: "benefits:read", label: "Read Benefits", description: "View benefit entries" },
  { value: "benefits:write", label: "Write Benefits", description: "Create/replace benefit entries" },
  { value: "company:read", label: "Read Company", description: "View company profile" },
  { value: "company:write", label: "Write Company", description: "Update company profile" },
];

export default function ApiKeysPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        setKeys(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch API keys:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user && !["CLIENT", "BROKER"].includes(session.user.role)) {
      router.push("/dashboard");
      return;
    }
    fetchKeys();
  }, [session, router, fetchKeys]);

  async function handleCreate() {
    if (!keyName.trim() || selectedScopes.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName, scopes: selectedScopes }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        fetchKeys();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create key");
      }
    } catch {
      alert("Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setRevoking(keyId);
    try {
      const res = await fetch("/api/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== keyId));
      }
    } catch {
      alert("Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  }

  function handleCopy() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCloseCreate() {
    setCreateOpen(false);
    setNewKey(null);
    setKeyName("");
    setSelectedScopes([]);
    setCopied(false);
  }

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">API Keys</h1>
          <p className="mt-1 text-slate-500">
            Manage API keys for programmatic access to your data
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Your API Keys
          </CardTitle>
          <CardDescription>
            Use these keys to authenticate API requests. See the{" "}
            <a href="/api-docs" className="text-eppione-cyan underline">API documentation</a>{" "}
            for usage details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="py-8 text-center">
              <Key className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No API keys</p>
              <p className="mt-1 text-sm text-slate-500">
                Create an API key to start using the API.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-500">
                      {key.keyPrefix}...
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={revoking === key.id}
                        onClick={() => handleRevoke(key.id)}
                      >
                        {revoking === key.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && handleCloseCreate()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {newKey ? "API Key Created" : "Create API Key"}
            </DialogTitle>
            <DialogDescription>
              {newKey
                ? "Copy this key now. It won't be shown again."
                : "Give your key a name and select permissions."}
            </DialogDescription>
          </DialogHeader>

          {newKey ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 rounded-md border bg-slate-50 p-3">
                <code className="flex-1 break-all text-sm font-mono">{newKey}</code>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCloseCreate}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g. HR Platform Integration"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="space-y-3">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <div key={scope.value} className="flex items-start gap-3">
                      <Checkbox
                        id={scope.value}
                        checked={selectedScopes.includes(scope.value)}
                        onCheckedChange={() => toggleScope(scope.value)}
                      />
                      <div>
                        <label htmlFor={scope.value} className="text-sm font-medium cursor-pointer">
                          {scope.label}
                        </label>
                        <p className="text-xs text-slate-500">{scope.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCloseCreate}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !keyName.trim() || selectedScopes.length === 0}
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Key"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
