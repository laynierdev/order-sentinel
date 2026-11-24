"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";

export interface HistoryPoint {
  orderId: string;
  createdAt: string;
  quantity: number;
  current: boolean;
  flagged: boolean;
}

export interface ProductHistory {
  productId: string;
  productName: string;
  avg: number;
  points: HistoryPoint[];
}

const tooltipStyle = { fontSize: 12, borderRadius: 6, borderColor: "#e2e8f0" };

/** Order detail: quantity of one product per order over 90 days, current order highlighted. */
export function CustomerHistoryChart({ series }: { series: ProductHistory[] }) {
  const [selected, setSelected] = useState(series[0]?.productId ?? "");
  const active = series.find((s) => s.productId === selected) ?? series[0];
  if (!active) return null;
  const data = active.points.map((p) => ({ ...p, label: formatDate(p.createdAt).slice(0, 5) }));
  return (
    <div className="space-y-3">
      {series.length > 1 ? (
        <Tabs value={active.productId} onValueChange={(v) => setSelected(String(v))}>
          <TabsList className="h-auto flex-wrap">
            {series.map((s) => (
              <TabsTrigger key={s.productId} value={s.productId} className="text-xs">
                {s.productName}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        <p className="text-sm font-medium text-slate-700">{active.productName}</p>
      )}
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} minTickGap={12} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "#f1f5f9" }}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as HistoryPoint | undefined;
                return p ? `${p.orderId} · ${formatDate(p.createdAt)}${p.current ? " (this order)" : ""}` : "";
              }}
              formatter={(value) => [value, "Quantity"]}
            />
            {active.avg > 0 ? (
              <ReferenceLine
                y={active.avg}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{ value: `90-day avg ${active.avg.toFixed(1)}`, position: "insideTopLeft", fontSize: 11, fill: "#475569" }}
              />
            ) : null}
            <Bar dataKey="quantity" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {data.map((p) => (
                <Cell key={p.orderId} fill={p.current ? "#dc2626" : p.flagged ? "#f59e0b" : "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red-600" /> This order</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-500" /> Other flagged orders</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-slate-400" /> Clear orders</span>
        {active.points.length <= 1 ? (
          <span className="ml-auto font-medium text-amber-700">First order of this product by this customer</span>
        ) : null}
      </div>
    </div>
  );
}

export interface WeeklyPoint {
  week: string; // YYYY-MM-DD (week start)
  clear: number;
  flagged: number;
}

/** Customer detail: orders per week, stacked clear vs. flagged. */
export function CustomerOrdersChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={(w: string) => formatDate(`${w}T12:00:00Z`).slice(0, 5)}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "#f1f5f9" }}
            labelFormatter={(w) => `Week of ${formatDate(`${String(w)}T12:00:00Z`)}`}
          />
          <Bar dataKey="clear" name="Clear" stackId="a" fill="#94a3b8" maxBarSize={32} />
          <Bar dataKey="flagged" name="Flagged" stackId="a" fill="#dc2626" radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
