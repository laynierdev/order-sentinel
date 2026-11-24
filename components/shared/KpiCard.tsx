import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: "default" | "amber" | "red" | "blue";
}

const TONE: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-slate-100 text-slate-600",
  blue: "bg-brand-50 text-brand-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "default" }: KpiCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-brand-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", TONE[tone])}>
          <Icon className="size-4.5" aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}
