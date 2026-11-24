import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, OctagonAlert, Percent, ShoppingCart } from "lucide-react";
import { OrdersTrendChart } from "@/components/charts/OrdersTrendChart";
import { RiskDonut } from "@/components/charts/RiskDonut";
import { KpiCard } from "@/components/shared/KpiCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSnapshot } from "@/lib/data";
import { formatPercent } from "@/lib/format";
import { TopAlertsTable } from "./TopAlertsTable";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await getSnapshot();
  const kpis = data.dashboardKpis();
  const delta = kpis.flagRate30 - kpis.flagRatePrev30;
  return (
    <>
      <PageHeader title="Dashboard" description="Suspicious order monitoring overview for the last 90 days." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Orders today"
          value={kpis.ordersToday}
          hint={`${kpis.flaggedToday} flagged by the rules engine`}
          icon={ShoppingCart}
          tone="blue"
        />
        <KpiCard label="In review" value={kpis.inReview} hint="Flagged orders awaiting a decision" icon={ClipboardCheck} tone="amber" />
        <KpiCard
          label="Suspicious pending"
          value={kpis.suspiciousPending}
          hint="Score ≥ 70, not yet decided"
          icon={OctagonAlert}
          tone="red"
        />
        <KpiCard
          label="Flag rate · 30 days"
          value={formatPercent(kpis.flagRate30)}
          hint={`${delta >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(delta))} vs. previous 30 days`}
          icon={Percent}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Orders per day</CardTitle>
            <CardDescription>All orders vs. orders flagged for review (Review + Suspicious)</CardDescription>
          </CardHeader>
          <CardContent>
            <OrdersTrendChart data={data.dailySeries()} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Risk distribution</CardTitle>
            <CardDescription>Orders by risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskDonut data={data.riskDistribution()} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 pb-0">
        <CardHeader>
          <CardTitle>Top alerts awaiting review</CardTitle>
          <CardDescription>Highest-scoring pending orders</CardDescription>
          <CardAction>
            <Link href="/review" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
              Open review queue <ArrowRight className="size-3.5" />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="border-t px-0">
          <TopAlertsTable rows={data.pendingRows().slice(0, 8)} />
        </CardContent>
      </Card>
    </>
  );
}
