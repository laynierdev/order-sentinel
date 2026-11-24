"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, SearchX, X } from "lucide-react";
import { RiskBadge, ScheduleBadge, StatusBadge } from "@/components/orders/RiskBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrderRow } from "@/lib/data";
import { formatCurrency, formatDate, formatNumber, isoDay } from "@/lib/format";

const PAGE_SIZE = 25;

const RISK_OPTIONS = { all: "All risk levels", suspicious: "Suspicious", review: "Review", clear: "Clear" };
const SCHEDULE_OPTIONS = { all: "All schedules", II: "Schedule II", III: "Schedule III", IV: "Schedule IV", V: "Schedule V" };
const TYPE_OPTIONS = {
  all: "All customer types",
  retail_pharmacy: "Retail pharmacy",
  hospital: "Hospital",
  clinic: "Clinic",
  long_term_care: "Long-term care",
};

type SortKey = "date" | "score";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

function SortIcon({ k, sort }: { k: SortKey; sort: SortState }) {
  if (sort.key !== k) return <ArrowUpDown className="size-3 opacity-50" />;
  return sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
}

interface OrdersTableProps {
  rows: OrderRow[];
  /** Hide the customer column and type filter (used on the customer detail page). */
  compact?: boolean;
  /** Pre-filled search (from the topbar search, `/orders?q=`). */
  initialQuery?: string;
}

export function OrdersTable({ rows, compact = false, initialQuery = "" }: OrdersTableProps) {
  const [query, setQuery] = useState(initialQuery);
  const [risk, setRisk] = useState("all");
  const [schedule, setSchedule] = useState("all");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q && !r.id.toLowerCase().includes(q) && !r.customerName.toLowerCase().includes(q)) return false;
      if (risk !== "all" && r.risk !== risk) return false;
      if (schedule !== "all" && !r.schedules.includes(schedule as OrderRow["schedules"][number])) return false;
      if (type !== "all" && r.customerType !== type) return false;
      const day = isoDay(r.createdAt);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) =>
      sort.key === "score"
        ? (a.score - b.score || a.createdAt.localeCompare(b.createdAt)) * dir
        : a.createdAt.localeCompare(b.createdAt) * dir,
    );
  }, [rows, query, risk, schedule, type, from, to, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const hasFilters = query || risk !== "all" || schedule !== "all" || type !== "all" || from || to;

  function update<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(0);
    };
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
    setPage(0);
  }

  function clearFilters() {
    setQuery("");
    setRisk("all");
    setSchedule("all");
    setType("all");
    setFrom("");
    setTo("");
    setPage(0);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => update(setQuery)(e.target.value)}
            placeholder={compact ? "Search order ID…" : "Search order ID or customer…"}
            className="bg-white pl-8"
            aria-label="Search orders"
          />
        </div>
        <FilterSelect label="Risk level" value={risk} onChange={update(setRisk)} options={RISK_OPTIONS} />
        <FilterSelect label="Schedule" value={schedule} onChange={update(setSchedule)} options={SCHEDULE_OPTIONS} />
        {compact ? null : (
          <FilterSelect label="Customer type" value={type} onChange={update(setType)} options={TYPE_OPTIONS} />
        )}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Input type="date" value={from} onChange={(e) => update(setFrom)(e.target.value)} className="w-36 bg-white" aria-label="From date" />
          <span>to</span>
          <Input type="date" value={to} onChange={(e) => update(setTo)(e.target.value)} className="w-36 bg-white" aria-label="To date" />
        </div>
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X /> Clear
          </Button>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">{formatNumber(filtered.length)} orders</span>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No orders match these filters"
          description="Try widening the date range or clearing some filters."
          action={
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Order</TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Date <SortIcon k="date" sort={sort} />
                </button>
              </TableHead>
              {compact ? null : <TableHead>Customer</TableHead>}
              <TableHead>Schedules</TableHead>
              <TableHead className="hidden text-right xl:table-cell">Lines</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("score")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Risk / score <SortIcon k="score" sort={sort} />
                </button>
              </TableHead>
              <TableHead className="pr-4">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-4 font-medium">
                  <Link href={`/orders/${r.id}`} className="text-brand-600 hover:underline">
                    {r.id}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums">{formatDate(r.createdAt)}</TableCell>
                {compact ? null : (
                  <TableCell className="max-w-64">
                    <Link href={`/customers/${r.customerId}`} className="block truncate hover:underline" title={r.customerName}>
                      {r.customerName}
                    </Link>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex gap-1">
                    {r.schedules.map((s) => (
                      <ScheduleBadge key={s} schedule={s} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="hidden text-right tabular-nums xl:table-cell">{r.lineCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(r.total)}</TableCell>
                <TableCell>
                  <RiskBadge risk={r.risk} score={r.score} />
                </TableCell>
                <TableCell className="pr-4">
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-between border-t px-4 py-2.5 text-sm text-muted-foreground">
        <span>
          {filtered.length === 0
            ? "0 results"
            : `${current * PAGE_SIZE + 1}–${Math.min(filtered.length, (current + 1) * PAGE_SIZE)} of ${formatNumber(filtered.length)}`}
        </span>
        <div className="flex items-center gap-2">
          <span>
            Page {current + 1} of {pageCount}
          </span>
          <Button variant="outline" size="icon-sm" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
