import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { getSnapshot } from "@/lib/data";
import { ReviewQueue } from "./ReviewQueue";

export const metadata: Metadata = { title: "Review Queue" };

export default async function ReviewPage() {
  const data = await getSnapshot();
  return (
    <>
      <PageHeader
        title="Review Queue"
        description="Flagged orders awaiting a decision. Every decision requires a documented note."
      />
      <ReviewQueue rows={data.pendingRows()} decidedInApp={data.audit.filter((e) => e.source === "app").length} />
    </>
  );
}
