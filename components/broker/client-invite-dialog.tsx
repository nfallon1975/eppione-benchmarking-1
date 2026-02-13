"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { COUNTRY_LABELS } from "@/lib/utils";
import { MultiCountryPicker } from "@/components/ui/country-picker";

interface ClientInviteDialogProps {
  onInvited: () => void;
}

export function ClientInviteDialog({ onInvited }: ClientInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState("VIEW_ONLY");
  const [countries, setCountries] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/broker/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accessLevel, countries }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send invite");
        return;
      }

      setSuccess(
        data.autoLinked
          ? "Client linked successfully! They already had an account."
          : "Invite sent successfully!"
      );
      setEmail("");
      onInvited();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(""); setSuccess(""); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite a Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Client</DialogTitle>
          <DialogDescription>
            Send an invitation to a client to connect them to your broker account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="invite-email">Client Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Access Level</Label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEW_ONLY">View Only</SelectItem>
                <SelectItem value="VIEW_AND_ADVISE">View & Advise</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              View Only: See benchmarking data. View & Advise: See data and provide recommendations.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Countries (leave empty for all)</Label>
            <MultiCountryPicker
              value={countries}
              onChange={setCountries}
              placeholder="Search and add countries..."
            />
            <p className="text-xs text-slate-500">
              {countries.length === 0
                ? "Broker will have access to all countries."
                : `Access limited to: ${countries.map((c) => COUNTRY_LABELS[c] || c).join(", ")}`}
            </p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
