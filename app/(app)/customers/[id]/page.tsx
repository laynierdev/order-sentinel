import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CustomerOrdersChart, type WeeklyPoint } from "@/components/charts/CustomerHistoryChart";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { RiskBadge } from "@/components/orders/RiskBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CUSTOMER_TYPE_LABEL, customerRiskScore, getSnapshot } from "@/lib/data";
import { daysAgo, formatCurrency, formatDate, formatNumber, isoDay } from "@/lib/format";
import { riskFromScore } from "@/lib/rules";
import type { Order } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/customers/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await getSnapshot();
  return { title: data.getCustomer(id)?.name ?? id };
}

function weekly(list: Order[]): WeeklyPoint[] {
  const weeks: WeeklyPoint[] = [];
  for (let w = 12; w >= 0; w--) weeks.push({ week: isoDay(daysAgo(w * 7 + 6)), clear: 0, flagged: 0 });
  for (const o of list) {
    const age = Math.floor((daysAgo(0).getTime() - new Date(o.createdAt).getTime()) / 86_400_000);
    const idx = 12 - Math.floor(age / 7);
    if (idx < 0 || idx > 12) continue;
    if (o.risk === "clear") weeks[idx].clear += 1;
    else weeks[idx].flagged += 1;
  }
  return weeks;
}

export default async function CustomerDetailPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const data = await getSnapshot();
  const { productById } = data;
  const customer = data.getCustomer(id);
  if (!customer) notFound();
  const list = data.ordersForCustomer(id);
  const flagged = list.filter((o) => o.risk !== "clear");
  const score = customerRiskScore(list);
  const total = list.reduce((s, o) => s + o.total, 0);

  // Top products by units
  const units = new Map<string, number>();
  for (const o of list) for (const l of o.lines) units.set(l.productId, (units.get(l.productId) ?? 0) + l.quantity);
  const topProducts = [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const details: [string, React.ReactNode][] = [
    ["Customer ID", customer.id],
    ["Type", CUSTOMER_TYPE_LABEL[customer.type]],
    ["Location", `${customer.city}, ${customer.state}`],
    ["Registration", <span key="r" className="font-mono text-xs">{customer.registrationId}</span>],
    ["Onboarded", formatDate(`${customer.onboardedAt}T12:00:00Z`)],
  ];

  return (
    <>
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to customers
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold text-brand-900">{customer.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {CUSTOMER_TYPE_LABEL[customer.type]} · {customer.city}, {customer.state}
            {customer.isNew ? <span className="ml-2 rounded bg-brand-50 px-1.5 text-xs font-medium text-brand-600">New customer</span> : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <RiskBadge risk={riskFromScore(score)} size="lg" />
          <span className="text-xs text-muted-foreground">Cumulative risk score {score} / 100</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              {details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2 first:pt-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat label="Orders · 90d" value={formatNumber(list.length)} />
              <Stat label="Flagged" value={formatNumber(flagged.length)} />
              <Stat label="Value" value={formatCurrency(total, true)} />
            </div>
            <p className="mt-5 mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Top products (units)</p>
            <ul className="space-y-1.5 text-sm">
              {topProducts.map(([pid, qty]) => (
                <li key={pid} className="flex justify-between gap-3">
                  <span className="truncate">{productById.get(pid)?.name}</span>
                  <span className="tabular-nums text-muted-foreground">{formatNumber(qty)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Orders per week</CardTitle>
            <CardDescription>Last 13 weeks · clear vs. flagged</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerOrdersChart data={weekly(list)} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 pb-0">
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>
            {flagged.length === 0 ? "No orders flagged in the last 90 days." : `${flagged.length} flagged orders in the last 90 days`}
          </CardDescription>
        </CardHeader>
        {flagged.length > 0 ? (
          <CardContent className="border-t px-0 pb-0">
            <OrdersTable rows={data.orderRows(flagged)} compact />
          </CardContent>
        ) : null}
      </Card>

      <Card className="mt-4 pb-0">
        <CardHeader>
          <CardTitle>All orders</CardTitle>
        </CardHeader>
        <CardContent className="border-t px-0 pb-0">
          <OrdersTable rows={data.orderRows(list)} compact />
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
