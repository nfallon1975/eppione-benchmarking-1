"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SpreadsheetPreviewProps {
  headers: string[];
  sampleData: Record<string, string>[];
  mappedColumns?: Record<string, string>; // sourceColumn -> targetField
}

export function SpreadsheetPreview({
  headers,
  sampleData,
  mappedColumns = {},
}: SpreadsheetPreviewProps) {
  return (
    <div className="overflow-auto rounded-md border max-h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-xs">#</TableHead>
            {headers.map((h) => {
              const mapped = mappedColumns[h];
              return (
                <TableHead
                  key={h}
                  className={`text-xs whitespace-nowrap ${
                    mapped ? "bg-blue-50" : mapped === null ? "bg-slate-100 text-slate-400" : ""
                  }`}
                >
                  {h}
                  {mapped && (
                    <div className="text-[10px] font-normal text-blue-600 mt-0.5">
                      → {mapped}
                    </div>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sampleData.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
              {headers.map((h) => (
                <TableCell key={h} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                  {row[h] || <span className="text-slate-300">—</span>}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
