import type { Metadata } from "next";
import Link from "next/link";
import { Download, ShieldCheck } from "lucide-react";
import { RiskBadge, StatusBadge } from "@/components/orders/RiskBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSnapshot } from "@/lib/data";
import { DEMO_TODAY, formatCurrency, formatDate, formatDateTime, formatNumber, isoDay } from "@/lib/format";
import { ReportDecisions, type DecisionLine } from "./ReportDecisions";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const data = await getSnapshot();
  const { orders, customerById } = data;
  const today = orders.filter((o) => isoDay(o.createdAt) === DEMO_TODAY);
  const flaggedToday = today.filter((o) => o.risk !== "clear").sort((a, b) => b.score - a.score);
  const pending = orders.filter((o) => data.reviewStatus(o) === "pending").length;
  const low = data.inventoryRows().filter((r) => r.belowReorder);
  const nameOf = (orderId: string) => customerById.get(data.getOrder(orderId)?.customerId ?? "")?.name ?? "—";
  // Decisions dated on the business date, plus every decision recorded through the app.
  const decisions: DecisionLine[] = data.audit
    .filter((e) => e.source === "app" || isoDay(e.createdAt) === DEMO_TODAY)
    .map((e) => ({ ...e, customerName: nameOf(e.orderId) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const summary = [
    { label: "Orders received", value: formatNumber(today.length) },
    { label: "Orders flagged", value: formatNumber(flaggedToday.length) },
    { label: "Value received", value: formatCurrency(today.reduce((s, o) => s + o.total, 0), true) },
    { label: "Pending in review queue", value: formatNumber(pending) },
    { label: "Decisions recorded", value: formatNumber(decisions.length) },
    { label: "Products below reorder point", value: formatNumber(low.length) },
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Preview of the daily report sent to the compliance team."
        actions={
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={0} />}>
              <Button disabled>
                <Download /> Download PDF
              </Button>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
        }
      />

      <Card className="mx-auto max-w-5xl gap-0 py-0 shadow-sm">
        {/* Report header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b bg-slate-50 px-8 py-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ShieldCheck className="size-4 text-brand-600" /> Order Sentinel
            </div>
            <h2 className="font-heading text-2xl font-semibold text-brand-900">Daily Inventory &amp; SOM Report</h2>
            <p className="text-sm text-muted-foreground">Demo Distributor, Inc. · DEA registrant (fictitious)</p>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Business date</dt>
            <dd className="font-medium tabular-nums">{formatDate(`${DEMO_TODAY}T12:00:00Z`)}</dd>
            <dt className="text-muted-foreground">Generated</dt>
            <dd className="tabular-nums">{formatDateTime(`${DEMO_TODAY}T18:00:00Z`)}</dd>
            <dt className="text-muted-foreground">Prepared for</dt>
            <dd>Compliance Officer</dd>
          </dl>
        </div>

        <ReportSection title="1. Summary of the day">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {summary.map((s) => (
              <div key={s.label} className="rounded-md border bg-white p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="2. Orders flagged today">
          {flaggedToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders were flagged on this business date.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Rules triggered</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedToday.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link href={`/orders/${o.id}`} className="text-brand-600 hover:underline">
                        {o.id}
                      </Link>
                    </TableCell>
                    <TableCell>{customerById.get(o.customerId)?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{[...new Set(o.ruleHits.map((h) => h.title))].join(", ")}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(o.total)}</TableCell>
                    <TableCell>
                      <RiskBadge risk={o.risk} score={o.score} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={data.reviewStatus(o)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ReportSection>

        <ReportSection title="3. Review decisions">
          <ReportDecisions rows={decisions} />
        </ReportSection>

        <ReportSection title="4. Low stock" last>
          {low.length === 0 ? (
            <p className="text-sm text-muted-foreground">All products are above their reorder point.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>NDC</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reorder point</TableHead>
                  <TableHead className="text-right">Days of supply</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {low.map((r) => (
                  <TableRow key={r.productId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-xs">{r.ndc}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-700">{formatNumber(r.onHand)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(r.reorderPoint)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.daysOfSupply}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ReportSection>
        <p className="border-t px-8 py-3 text-center text-xs text-muted-foreground">
          Demo environment — all data in this report is fictitious.
        </p>
      </Card>
    </>
  );
}

function ReportSection({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section className={last ? "px-8 py-6" : "border-b px-8 py-6"}>
      <h3 className="mb-3 font-heading text-sm font-semibold tracking-wide text-brand-700 uppercase">{title}</h3>
      {children}
    </section>
  );
}
