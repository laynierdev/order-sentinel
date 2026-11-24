import Link from "next/link";
import { RiskBadge } from "@/components/orders/RiskBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OrderRow } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";

export function TopAlertsTable({ rows }: { rows: OrderRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No alerts awaiting review" description="All flagged orders have a decision." />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Main rule</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="pr-4 text-right">Risk</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="pl-4 font-medium">
              <Link href={`/orders/${r.id}`} className="text-brand-600 hover:underline">
                {r.id}
              </Link>
            </TableCell>
            <TableCell className="max-w-56 truncate" title={r.customerName}>
              {r.customerName}
            </TableCell>
            <TableCell className="tabular-nums">{formatDate(r.createdAt)}</TableCell>
            <TableCell className="text-muted-foreground">{r.topRule ?? "—"}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(r.total)}</TableCell>
            <TableCell className="pr-4 text-right">
              <RiskBadge risk={r.risk} score={r.score} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
