"use client";

import { useState, useEffect } from "react";
import { Clock, User, FileText, RefreshCw, Shield, AlertTriangle, Plus, Minus, Link2, Eye } from "lucide-react";

interface HistoryEntry {
  id: string;
  linkedType: string;
  linkedId: string;
  changeType: string;
  previousValue: string | null;
  newValue: string | null;
  changedBy: { name: string | null; email: string } | null;
  changeSource: string;
  reviewCycle: { month: string } | null;
  notes: string | null;
  createdAt: string;
}

const CHANGE_TYPE_CONFIG: Record<string, { label: string; Icon: typeof Clock; color: string }> = {
  CREATED: { label: "Created", Icon: Plus, color: "text-green-600" },
  UPDATED: { label: "Updated", Icon: RefreshCw, color: "text-blue-600" },
  SOURCE_ADDED: { label: "Source Added", Icon: Link2, color: "text-cyan-600" },
  SOURCE_REMOVED: { label: "Source Removed", Icon: Minus, color: "text-orange-600" },
  CONFIDENCE_RECALCULATED: { label: "Confidence Updated", Icon: Shield, color: "text-purple-600" },
  VERIFIED: { label: "Verified", Icon: Eye, color: "text-green-600" },
  FLAGGED: { label: "Flagged", Icon: AlertTriangle, color: "text-amber-600" },
  DEACTIVATED: { label: "Deactivated", Icon: Minus, color: "text-red-600" },
};

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual edit",
  PDF_IMPORT: "PDF import",
  MONTHLY_REVIEW: "Monthly review",
  BROKER_CONTRIBUTION: "Broker contribution",
  ADMIN_EDIT: "Admin edit",
};

interface AuditTrailProps {
  linkedType: string;
  linkedId: string;
  maxEntries?: number;
}

export function AuditTrail({ linkedType, linkedId, maxEntries = 20 }: AuditTrailProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/audit?linkedType=${linkedType}&linkedId=${linkedId}&limit=${maxEntries}`)
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [linkedType, linkedId, maxEntries]);

  if (loading) {
    return <div className="text-sm text-slate-400">Loading history...</div>;
  }

  if (entries.length === 0) {
    return <div className="text-sm text-slate-400">No history available.</div>;
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => {
        const config = CHANGE_TYPE_CONFIG[entry.changeType] || {
          label: entry.changeType,
          Icon: FileText,
          color: "text-slate-500",
        };
        const isLast = i === entries.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-1 ${config.color} bg-white border border-slate-200`}>
                <config.Icon className="h-3 w-3" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-slate-200" />}
            </div>

            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-xs text-slate-400">
                  {SOURCE_LABELS[entry.changeSource] || entry.changeSource}
                </span>
                {entry.reviewCycle && (
                  <span className="text-xs text-purple-500">
                    ({entry.reviewCycle.month} review)
                  </span>
                )}
              </div>

              {/* Value change */}
              {(entry.previousValue || entry.newValue) && (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  {entry.previousValue && (
                    <span className="line-through text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                      {entry.previousValue}
                    </span>
                  )}
                  {entry.previousValue && entry.newValue && (
                    <span className="text-slate-400">&rarr;</span>
                  )}
                  {entry.newValue && (
                    <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      {entry.newValue}
                    </span>
                  )}
                </div>
              )}

              {entry.notes && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{entry.notes}</p>
              )}

              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <User className="h-3 w-3" />
                <span>{entry.changedBy?.name || entry.changedBy?.email || "System"}</span>
                <span>&middot;</span>
                <Clock className="h-3 w-3" />
                <span>
                  {new Date(entry.createdAt).toLocaleDateString("en-IE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
