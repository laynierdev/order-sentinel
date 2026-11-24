"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { RiskBadge } from "@/components/orders/RiskBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CustomerRow } from "@/lib/data";
import { formatDate } from "@/lib/format";

const TYPE_LABEL: Record<CustomerRow["type"], string> = {
  retail_pharmacy: "Retail pharmacy",
  hospital: "Hospital",
  clinic: "Clinic",
  long_term_care: "Long-term care",
};
const TYPE_OPTIONS = { all: "All customer types", ...TYPE_LABEL };
const RISK_OPTIONS = { all: "All risk levels", suspicious: "Suspicious", review: "Review", clear: "Clear" };

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [risk, setRisk] = useState("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter(
        (r) =>
          (!q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.city.toLowerCase().includes(q)) &&
          (type === "all" || r.type === type) &&
          (risk === "all" || r.risk === risk),
      )
      .sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name));
  }, [rows, query, type, risk]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ID or city…"
            className="bg-white pl-8"
            aria-label="Search customers"
          />
        </div>
        <FilterSelect label="Customer type" value={type} onChange={setType} options={TYPE_OPTIONS} />
        <FilterSelect label="Risk level" value={risk} onChange={setRisk} options={RISK_OPTIONS} />
        <span className="ml-auto text-xs text-muted-foreground">{visible.length} customers</span>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={SearchX} title="No customers match these filters" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Orders · 90d</TableHead>
              <TableHead className="text-right">Flagged</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead>Last order</TableHead>
              <TableHead className="pr-4">Cumulative risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-72 pl-4">
                  <Link href={`/customers/${r.id}`} className="block truncate font-medium text-brand-600 hover:underline" title={r.name}>
                    {r.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {r.id}
                    {r.isNew ? <span className="ml-1.5 rounded bg-brand-50 px-1 font-medium text-brand-600">New</span> : null}
                  </span>
                </TableCell>
                <TableCell>{TYPE_LABEL[r.type]}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.city}, {r.state}
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.orders90}</TableCell>
                <TableCell className="text-right tabular-nums">{r.flagged90}</TableCell>
                <TableCell className="text-right tabular-nums">{r.pending || "—"}</TableCell>
                <TableCell className="tabular-nums">{r.lastOrderAt ? formatDate(r.lastOrderAt) : "—"}</TableCell>
                <TableCell className="pr-4">
                  <RiskBadge risk={r.risk} score={r.riskScore} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
