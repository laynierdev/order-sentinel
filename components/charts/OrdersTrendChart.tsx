"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "@/lib/format";

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  orders: number;
  flagged: number;
}

const shortDate = (iso: string) => formatDate(`${iso}T12:00:00Z`).slice(0, 5);

export function OrdersTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#256caa" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#256caa" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="flaggedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#dc2626" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            minTickGap={24}
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            labelFormatter={(label) => formatDate(`${String(label)}T12:00:00Z`)}
            contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: "#e2e8f0" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="orders" name="All orders" stroke="#256caa" strokeWidth={1.5} fill="url(#ordersFill)" />
          <Area type="monotone" dataKey="flagged" name="Flagged" stroke="#dc2626" strokeWidth={1.5} fill="url(#flaggedFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
