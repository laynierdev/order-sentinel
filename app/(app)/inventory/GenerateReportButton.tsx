"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GenerateReportButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  function onClick() {
    setBusy(true);
    setTimeout(() => {
      toast.success("Daily report generated", { description: "Daily Inventory & SOM Report is ready to review." });
      router.push("/reports");
    }, 900);
  }
  return (
    <Button onClick={onClick} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <FileText />}
      Generate daily report
    </Button>
  );
}
