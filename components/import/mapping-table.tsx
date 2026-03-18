"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfidenceBadge } from "./confidence-badge";
import { TARGET_FIELDS } from "@/lib/import-target-fields";
import { Info } from "lucide-react";

interface ColumnMappingData {
  id: string;
  sourceColumn: string;
  sourceColumnIndex: number;
  targetField: string | null;
  targetFieldLabel: string | null;
  targetBenefitCategory: string | null;
  confidence: number;
  status: string;
  sampleValues: string[];
  detectedType: string;
  transformRule: string | null;
  aiReasoning: string | null;
}

interface MappingTableProps {
  mappings: ColumnMappingData[];
  onMappingChange: (id: string, field: string, value: string | null) => void;
}

// Group target fields by entity
const FIELD_GROUPS = [
  { label: "Company", fields: TARGET_FIELDS.filter((f) => f.entity === "COMPANY") },
  { label: "Benefit (General)", fields: TARGET_FIELDS.filter((f) => f.entity === "BENEFIT" && !("category" in f && f.category)) },
  { label: "Health", fields: TARGET_FIELDS.filter((f) => "category" in f && f.category === "HEALTH") },
  { label: "Life Insurance", fields: TARGET_FIELDS.filter((f) => "category" in f && f.category === "LIFE") },
  { label: "Income Protection", fields: TARGET_FIELDS.filter((f) => "category" in f && f.category === "INCOME_PROTECTION") },
  { label: "Critical Illness", fields: TARGET_FIELDS.filter((f) => "category" in f && f.category === "CRITICAL_ILLNESS") },
  { label: "Dental", fields: TARGET_FIELDS.filter((f) => "category" in f && f.category === "DENTAL") },
  { label: "Pension", fields: TARGET_FIELDS.filter((f) => "category" in f && f.category === "PENSION") },
  { label: "Annual Leave", fields: TARGET_FIELDS.filter((f) => "category" in f && f.category === "ANNUAL_LEAVE") },
  { label: "Sick Pay", fields: TARGET_FIELDS.filter((f) => "category" in f && f.category === "SICK_PAY") },
  { label: "Maternity", fields: TARGET_FIELDS.filter((f) => "category" in f && f.category === "MATERNITY_PAY") },
  { label: "Paternity", fields: TARGET_FIELDS.filter((f) => "category" in f && f.category === "PATERNITY_PAY") },
  { label: "Platform", fields: TARGET_FIELDS.filter((f) => f.entity === "PLATFORM") },
];

export function MappingTable({ mappings, onMappingChange }: MappingTableProps) {
  return (
    <TooltipProvider>
      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Source Column</TableHead>
              <TableHead className="text-xs">Sample Values</TableHead>
              <TableHead className="text-xs">Confidence</TableHead>
              <TableHead className="text-xs min-w-[250px]">Mapped To</TableHead>
              <TableHead className="text-xs w-10">Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((m) => (
              <TableRow
                key={m.id}
                className={
                  !m.targetField
                    ? "bg-slate-50 opacity-60"
                    : m.confidence < 0.6
                    ? "bg-red-50/30"
                    : ""
                }
              >
                <TableCell className="text-sm font-medium">
                  {m.sourceColumn}
                  <div className="text-[10px] text-slate-400">{m.detectedType}</div>
                </TableCell>
                <TableCell className="text-xs text-slate-500 max-w-[200px]">
                  {m.sampleValues.slice(0, 3).map((v, i) => (
                    <span key={i}>
                      {i > 0 && ", "}
                      <span className="bg-slate-100 rounded px-1">{v}</span>
                    </span>
                  ))}
                </TableCell>
                <TableCell>
                  <ConfidenceBadge confidence={m.confidence} />
                </TableCell>
                <TableCell>
                  <Select
                    value={m.targetField || "__unmapped__"}
                    onValueChange={(val) =>
                      onMappingChange(
                        m.id,
                        "targetField",
                        val === "__unmapped__" ? null : val
                      )
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Unmapped (skip)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unmapped__">
                        <span className="text-slate-400">Unmapped (skip)</span>
                      </SelectItem>
                      {FIELD_GROUPS.map(
                        (group) =>
                          group.fields.length > 0 && (
                            <div key={group.label}>
                              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                                {group.label}
                              </div>
                              {group.fields.map((f) => (
                                <SelectItem key={f.field} value={f.field}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </div>
                          )
                      )}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {m.aiReasoning && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        {m.aiReasoning}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
