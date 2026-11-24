"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { RISK_COLOR } from "@/components/orders/RiskBadge";
import { formatNumber } from "@/lib/format";
import type { RiskLevel } from "@/lib/types";

const LABEL: Record<RiskLevel, string> = { clear: "Clear", review: "Review", suspicious: "Suspicious" };

export function RiskDonut({ data }: { data: Record<RiskLevel, number> }) {
  const total = data.clear + data.review + data.suspicious;
  const rows = (Object.keys(LABEL) as RiskLevel[]).map((k) => ({ key: k, name: LABEL[k], value: data[k] }));
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-48 w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="100%" paddingAngle={1.5} stroke="none">
              {rows.map((r) => (
                <Cell key={r.key} fill={RISK_COLOR[r.key]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e2e8f0" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{formatNumber(total)}</span>
          <span className="text-xs text-muted-foreground">orders · 90 days</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: RISK_COLOR[r.key] }} aria-hidden />
            <span className="text-slate-700">{r.name}</span>
            <span className="ml-auto tabular-nums font-medium">{formatNumber(r.value)}</span>
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
              {total ? ((r.value / total) * 100).toFixed(1) : "0.0"}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
