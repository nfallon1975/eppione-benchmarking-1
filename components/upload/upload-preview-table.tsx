"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import type { RowValidationResult } from "@/lib/upload-utils";

interface Column {
  key: string;
  label: string;
}

interface UploadPreviewTableProps<T> {
  columns: Column[];
  results: RowValidationResult<T>[];
}

const PAGE_SIZE = 50;

export function UploadPreviewTable<T extends Record<string, unknown>>({
  columns,
  results,
}: UploadPreviewTableProps<T>) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  const pageResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const validCount = results.filter((r) => r.valid).length;
  const errorCount = results.length - validCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">
          {results.length} row{results.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="success">{validCount} valid</Badge>
        {errorCount > 0 && (
          <Badge variant="destructive">{errorCount} error{errorCount !== 1 ? "s" : ""}</Badge>
        )}
      </div>

      <div className="overflow-auto rounded-md border" style={{ maxHeight: "500px" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-16">Status</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageResults.map((result) => {
              const errorFields = new Set(
                result.errors?.map((e) => e.field) || []
              );
              return (
                <TableRow
                  key={result.rowIndex}
                  className={result.valid ? "" : "bg-red-50"}
                >
                  <TableCell className="text-xs text-slate-500">
                    {result.rowIndex + 2}
                  </TableCell>
                  <TableCell>
                    {result.valid ? (
                      <Badge variant="success" className="text-xs">OK</Badge>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Error
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <ul className="space-y-1 text-xs">
                              {result.errors?.map((err, i) => (
                                <li key={i}>
                                  <span className="font-medium">{err.field}:</span>{" "}
                                  {err.message}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  {columns.map((col) => {
                    const value = result.data
                      ? String((result.data as Record<string, unknown>)[col.key] ?? "")
                      : "";
                    const hasError = errorFields.has(col.key);
                    return (
                      <TableCell
                        key={col.key}
                        className={`text-sm ${hasError ? "text-red-600 font-medium" : ""}`}
                      >
                        {value || "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
