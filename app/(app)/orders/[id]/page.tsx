import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, DollarSign, MapPin } from "lucide-react";
import { CustomerHistoryChart, type ProductHistory } from "@/components/charts/CustomerHistoryChart";
import { ReviewActions } from "@/components/orders/ReviewActions";
import { RiskBadge, ScheduleBadge } from "@/components/orders/RiskBadge";
import { RuleHitList } from "@/components/orders/RuleHitList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CUSTOMER_TYPE_LABEL, getSnapshot } from "@/lib/data";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: id };
}

export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const data = await getSnapshot();
  const { productById } = data;
  const order = data.getOrder(id);
  if (!order) notFound();
  const customer = data.getCustomer(order.customerId);
  const history = data
    .ordersForCustomer(order.customerId)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Products that triggered a rule go first in the history chart.
  const hitProducts = new Set(order.ruleHits.map((h) => h.productId));
  const lineProducts = [...order.lines]
    .sort((a, b) => Number(hitProducts.has(b.productId)) - Number(hitProducts.has(a.productId)))
    .map((l) => l.productId);
  const series: ProductHistory[] = lineProducts.map((productId) => {
    const points = history
      .filter((o) => o.lines.some((l) => l.productId === productId))
      .map((o) => ({
        orderId: o.id,
        createdAt: o.createdAt,
        quantity: o.lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.quantity, 0),
        current: o.id === order.id,
        flagged: o.risk !== "clear",
      }));
    const others = points.filter((p) => !p.current);
    const avg = others.length ? others.reduce((s, p) => s + p.quantity, 0) / others.length : 0;
    return { productId, productName: productById.get(productId)?.name ?? productId, avg, points };
  });

  return (
    <>
      <Link href="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to orders
      </Link>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Order</p>
            <h1 className="font-heading text-3xl font-semibold text-brand-900">{order.id}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
              <Link href={`/customers/${order.customerId}`} className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline">
                <Building2 className="size-4" /> {customer?.name ?? order.customerId}
              </Link>
              {customer ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" /> {customer.city}, {customer.state} · {CUSTOMER_TYPE_LABEL[customer.type]}
                  {customer.isNew ? <span className="rounded bg-brand-50 px-1.5 text-xs font-medium text-brand-600">New customer</span> : null}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" /> {formatDateTime(order.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <DollarSign className="size-4" /> {formatCurrency(order.total)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <RiskBadge risk={order.risk} size="lg" />
            <span className="text-sm text-muted-foreground">
              Risk score <span className="font-semibold text-slate-900 tabular-nums">{order.score}</span> / 100
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Rules triggered</CardTitle>
              <CardDescription>
                {order.ruleHits.length} {order.ruleHits.length === 1 ? "rule" : "rules"} fired for this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RuleHitList hits={order.ruleHits} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer history</CardTitle>
              <CardDescription>Quantity ordered per order over the last 90 days</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerHistoryChart series={series} />
            </CardContent>
          </Card>

          <Card className="pb-0">
            <CardHeader>
              <CardTitle>Order lines</CardTitle>
            </CardHeader>
            <CardContent className="border-t px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Product</TableHead>
                    <TableHead>NDC</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="pr-4 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines.map((l) => {
                    const p = productById.get(l.productId);
                    return (
                      <TableRow key={l.productId} className={hitProducts.has(l.productId) ? "bg-red-50/50" : undefined}>
                        <TableCell className="pl-4">
                          <p className="font-medium">{p?.name ?? l.productId}</p>
                          <p className="text-xs text-muted-foreground">{p?.unit}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p?.ndc}</TableCell>
                        <TableCell>{p ? <ScheduleBadge schedule={p.schedule} /> : null}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(l.quantity)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(l.unitPrice)}</TableCell>
                        <TableCell className="pr-4 text-right tabular-nums">{formatCurrency(l.quantity * l.unitPrice)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle>Review decision</CardTitle>
            <CardDescription>Approve, hold or escalate this order</CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewActions orderId={order.id} status={data.reviewStatus(order)} audit={data.auditFor(order.id)} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
