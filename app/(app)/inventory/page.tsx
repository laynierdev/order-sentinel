import type { Metadata } from "next";
import { AlertTriangle, Boxes, DollarSign, PackageX } from "lucide-react";
import { ScheduleBadge } from "@/components/orders/RiskBadge";
import { KpiCard } from "@/components/shared/KpiCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSnapshot } from "@/lib/data";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GenerateReportButton } from "./GenerateReportButton";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const data = await getSnapshot();
  const { productById } = data;
  const rows = data
    .inventoryRows().sort((a, b) => Number(b.belowReorder) - Number(a.belowReorder) || a.name.localeCompare(b.name));
  const low = rows.filter((r) => r.belowReorder);
  const value = rows.reduce((s, r) => s + r.onHand * (productById.get(r.productId)?.unitCost ?? 0), 0);
  const scheduleIIUnits = rows.filter((r) => r.schedule === "II").reduce((s, r) => s + r.onHand, 0);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Controlled-substance stock on hand at the distribution center."
        actions={<GenerateReportButton />}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Products tracked" value={rows.length} icon={Boxes} tone="blue" />
        <KpiCard label="Below reorder point" value={low.length} hint={low.map((r) => r.name.split(" ")[0]).join(", ")} icon={PackageX} tone="red" />
        <KpiCard label="Schedule II units on hand" value={formatNumber(scheduleIIUnits)} icon={AlertTriangle} tone="amber" />
        <KpiCard label="Inventory value (cost)" value={formatCurrency(value, true)} icon={DollarSign} />
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Product</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="w-48">Stock level</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Reorder point</TableHead>
              <TableHead className="text-right">Days of supply</TableHead>
              <TableHead className="pr-4 whitespace-nowrap">Last received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const max = Math.max(r.onHand, r.reorderPoint * 3);
              const pct = Math.min(100, (r.onHand / max) * 100);
              const reorderPct = Math.min(100, (r.reorderPoint / max) * 100);
              return (
                <TableRow key={r.productId} className={r.belowReorder ? "bg-red-50/40" : undefined}>
                  <TableCell className="max-w-72 pl-4">
                    <p className="truncate font-medium" title={r.name}>
                      {r.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      NDC <span className="font-mono">{r.ndc}</span> · {r.unit}
                    </p>
                  </TableCell>
                  <TableCell>
                    <ScheduleBadge schedule={r.schedule} />
                  </TableCell>
                  <TableCell>
                    <div className="relative h-2 w-full rounded-full bg-slate-100" aria-label={`${Math.round(pct)}% of target stock`}>
                      <div
                        className={cn("h-2 rounded-full", r.belowReorder ? "bg-red-500" : "bg-brand-500")}
                        style={{ width: `${pct}%` }}
                      />
                      <div className="absolute -top-1 h-4 w-px bg-slate-500" style={{ left: `${reorderPct}%` }} title="Reorder point" />
                    </div>
                    {r.belowReorder ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-red-700">
                        <AlertTriangle className="size-3" /> Below reorder point
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(r.onHand)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatNumber(r.allocated)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(r.reorderPoint)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", r.daysOfSupply < 14 && "font-medium text-red-700")}>
                    {r.daysOfSupply >= 999 ? "—" : r.daysOfSupply}
                  </TableCell>
                  <TableCell className="pr-4 tabular-nums">{formatDate(`${r.lastReceivedAt}T12:00:00Z`)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
