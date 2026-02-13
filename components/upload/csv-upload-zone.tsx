"use client";

import { useRef, useState, DragEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText } from "lucide-react";

interface CsvUploadZoneProps {
  onFileLoaded: (text: string, filename: string) => void;
  onClear: () => void;
  filename?: string;
  fileSize?: number;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function CsvUploadZone({
  onFileLoaded,
  onClear,
  filename,
  fileSize,
}: CsvUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    if (!file.name.endsWith(".csv")) {
      setError("Only .csv files are accepted");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onFileLoaded(text, file.name);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  if (filename) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-eppione-cyan" />
            <div>
              <p className="text-sm font-medium text-slate-900">{filename}</p>
              {fileSize !== undefined && (
                <p className="text-xs text-slate-500">
                  {(fileSize / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4" />
            Remove
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragging
              ? "border-eppione-cyan bg-eppione-cyan/5"
              : "border-slate-200 hover:border-slate-300"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="mb-3 h-8 w-8 text-slate-400" />
          <p className="mb-1 text-sm font-medium text-slate-700">
            Drop a CSV file here, or{" "}
            <button
              type="button"
              className="text-eppione-cyan underline"
              onClick={() => inputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <p className="text-xs text-slate-500">CSV files only, max 10MB</p>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
