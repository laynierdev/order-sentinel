import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { ImportWorkbench } from "./ImportWorkbench";

export const metadata: Metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Import" description="Screen new orders from an ERP export before they ship." />
      <ImportWorkbench />
    </>
  );
}
