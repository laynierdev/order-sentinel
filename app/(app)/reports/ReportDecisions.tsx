import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/orders/RiskBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditEntry } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export interface DecisionLine extends AuditEntry {
  customerName: string;
}

/** Review decisions taken from the audit trail. */
export function ReportDecisions({ rows }: { rows: DecisionLine[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No review decisions recorded for this business date.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Decision</TableHead>
          <TableHead>Reviewer</TableHead>
          <TableHead>Note</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-medium">
              <Link href={`/orders/${d.orderId}`} className="text-brand-600 hover:underline">
                {d.orderId}
              </Link>
            </TableCell>
            <TableCell className="max-w-48 truncate" title={d.customerName}>
              {d.customerName}
            </TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1">
                {d.fromStatus ? (
                  <>
                    <StatusBadge status={d.fromStatus} />
                    <ArrowRight className="size-3 text-muted-foreground" aria-label="changed to" />
                  </>
                ) : null}
                <StatusBadge status={d.toStatus} />
              </span>
            </TableCell>
            <TableCell className="whitespace-nowrap">{d.reviewer}</TableCell>
            <TableCell className="max-w-64 truncate text-muted-foreground" title={d.note}>
              {d.note}
            </TableCell>
            <TableCell className="text-right tabular-nums whitespace-nowrap">{formatDateTime(d.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
