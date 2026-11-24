import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { getSnapshot } from "@/lib/data";
import { CustomersTable } from "./CustomersTable";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const data = await getSnapshot();
  return (
    <>
      <PageHeader
        title="Customers"
        description="Registered customers ranked by cumulative risk (based on their highest-scoring orders in the last 90 days)."
      />
      <Card className="py-0">
        <CustomersTable rows={data.customerRows()} />
      </Card>
    </>
  );
}
