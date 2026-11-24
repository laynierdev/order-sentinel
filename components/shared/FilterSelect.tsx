"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>; // value → label
  label: string;
  className?: string;
}

/** Thin wrapper over shadcn/Base UI Select for string-valued filters. */
export function FilterSelect({ value, onChange, options, label, className }: FilterSelectProps) {
  return (
    <Select items={options} value={value} onValueChange={(v) => onChange(v ?? Object.keys(options)[0])}>
      <SelectTrigger className={cn("min-w-36 bg-white", className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
