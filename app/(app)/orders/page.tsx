import type { Metadata } from "next";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { getSnapshot } from "@/lib/data";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.slice(0, 100) : "";
  const data = await getSnapshot();
  return (
    <>
      <PageHeader title="Orders" description="All controlled-substance orders from the last 90 days, scored by the rules engine." />
      <Card className="py-0">
        <OrdersTable key={query} rows={data.orderRows()} initialQuery={query} />
      </Card>
    </>
  );
}
