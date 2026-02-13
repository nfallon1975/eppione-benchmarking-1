"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface UploadResultDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  results: {
    label: string;
    value: number | string;
  }[];
  warnings?: string[];
}

export function UploadResultDialog({
  open,
  onClose,
  title,
  results,
  warnings,
}: UploadResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {title}
          </DialogTitle>
          <DialogDescription>Upload completed successfully.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {results.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{r.label}</span>
              <span className="text-sm font-medium text-slate-900">{r.value}</span>
            </div>
          ))}

          {warnings && warnings.length > 0 && (
            <div className="mt-4 rounded-md bg-amber-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Warnings</span>
              </div>
              <ul className="space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700">{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
