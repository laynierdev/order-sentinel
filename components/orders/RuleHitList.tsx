import { CalendarClock, Gauge, TrendingUp, UserPlus, Users } from "lucide-react";
import type { RuleHit, RuleId } from "@/lib/types";

const ICON: Record<RuleId, typeof Gauge> = {
  "quantity-spike": TrendingUp,
  frequency: CalendarClock,
  "new-customer-schedule-ii": UserPlus,
  "peer-deviation": Users,
  "monthly-cap": Gauge,
};

export function RuleHitList({ hits }: { hits: RuleHit[] }) {
  if (hits.length === 0) {
    return <p className="text-sm text-muted-foreground">No rules were triggered. This order is within the customer&apos;s normal pattern.</p>;
  }
  return (
    <ul className="divide-y">
      {hits.map((hit, i) => {
        const Icon = ICON[hit.ruleId];
        return (
          <li key={`${hit.ruleId}-${hit.productId ?? i}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
              <Icon className="size-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{hit.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{hit.explanation}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
