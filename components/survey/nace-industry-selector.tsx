"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NACE_SECTIONS, NACE_INDUSTRIES } from "@/lib/utils";

interface NaceIndustrySelectorProps {
  sector: string;
  industryCode: string;
  onSectorChange: (sector: string) => void;
  onIndustryCodeChange: (code: string) => void;
}

export function NaceIndustrySelector({
  sector,
  industryCode,
  onSectorChange,
  onIndustryCodeChange,
}: NaceIndustrySelectorProps) {
  const filteredIndustries = Object.entries(NACE_INDUSTRIES).filter(
    ([code]) => code.startsWith(sector)
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Industry Sector</Label>
        <Select
          value={sector}
          onValueChange={(v) => {
            onSectorChange(v);
            onIndustryCodeChange("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select sector" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(NACE_SECTIONS).map(([letter, name]) => (
              <SelectItem key={letter} value={letter}>
                {letter} — {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Sub-Industry</Label>
        <Select
          value={industryCode}
          onValueChange={onIndustryCodeChange}
          disabled={!sector}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={sector ? "Select sub-industry" : "Select sector first"}
            />
          </SelectTrigger>
          <SelectContent>
            {filteredIndustries.map(([code, name]) => (
              <SelectItem key={code} value={code}>
                {code} — {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
