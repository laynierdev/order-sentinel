import { CheckCircle2, CircleDashed, OctagonAlert, PauseCircle, ShieldAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewStatus, RiskLevel } from "@/lib/types";

const RISK: Record<RiskLevel, { label: string; className: string; icon: typeof ShieldAlert }> = {
  clear: { label: "Clear", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: CheckCircle2 },
  review: { label: "Review", className: "bg-amber-50 text-amber-800 ring-amber-600/25", icon: TriangleAlert },
  suspicious: { label: "Suspicious", className: "bg-red-50 text-red-700 ring-red-600/20", icon: OctagonAlert },
};

export const RISK_COLOR: Record<RiskLevel, string> = {
  clear: "#10b981",
  review: "#f59e0b",
  suspicious: "#dc2626",
};

interface RiskBadgeProps {
  risk: RiskLevel;
  score?: number;
  size?: "sm" | "lg";
  className?: string;
}

export function RiskBadge({ risk, score, size = "sm", className }: RiskBadgeProps) {
  const { label, className: tone, icon: Icon } = RISK[risk];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-medium whitespace-nowrap ring-1 ring-inset",
        size === "lg" ? "px-3 py-1.5 text-sm" : "px-1.5 py-0.5 text-xs",
        tone,
        className,
      )}
    >
      <Icon className={size === "lg" ? "size-4" : "size-3"} aria-hidden />
      {label}
      {score !== undefined ? <span className="tabular-nums opacity-70">· {score}</span> : null}
    </span>
  );
}

const STATUS: Record<ReviewStatus, { label: string; className: string; icon: typeof ShieldAlert }> = {
  pending: { label: "Pending", className: "text-slate-600 ring-slate-300", icon: CircleDashed },
  approved: { label: "Approved", className: "text-emerald-700 ring-emerald-300", icon: CheckCircle2 },
  held: { label: "Held", className: "text-amber-800 ring-amber-300", icon: PauseCircle },
  escalated: { label: "Escalated", className: "text-red-700 ring-red-300", icon: ShieldAlert },
};

export function StatusBadge({ status, className }: { status: ReviewStatus | null; className?: string }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const { label, className: tone, icon: Icon } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}

export function ScheduleBadge({ schedule }: { schedule: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-7 justify-center rounded px-1 py-0.5 text-[11px] font-semibold tabular-nums ring-1 ring-inset",
        schedule === "II" ? "bg-brand-800 text-white ring-brand-800" : "bg-slate-50 text-slate-700 ring-slate-300",
      )}
      title={`Schedule ${schedule}`}
    >
      C-{schedule}
    </span>
  );
}
