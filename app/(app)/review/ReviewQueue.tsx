"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ClipboardCheck, PartyPopper, PauseCircle, ShieldAlert } from "lucide-react";
import { QuickDecisionDialog } from "@/components/orders/ReviewActions";
import { RiskBadge, ScheduleBadge } from "@/components/orders/RiskBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { OrderRow } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { Decision } from "@/lib/review";

const RISK_OPTIONS = { all: "All flagged", suspicious: "Suspicious only", review: "Review only" };

export function ReviewQueue({ rows, decidedInApp }: { rows: OrderRow[]; decidedInApp: number }) {
  const [risk, setRisk] = useState("all");
  const [target, setTarget] = useState<{ orderId: string; action: Decision } | null>(null);

  const pending = rows;
  const visible = pending.filter((r) => risk === "all" || r.risk === risk);
  const suspicious = pending.filter((r) => r.risk === "suspicious").length;

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card size="sm" className="flex-row items-center gap-3 px-4">
          <ClipboardCheck className="size-5 text-amber-600" />
          <div>
            <p className="font-heading text-3xl font-semibold tabular-nums text-brand-900" aria-live="polite">{pending.length}</p>
            <p className="text-xs text-muted-foreground">orders awaiting a decision</p>
          </div>
        </Card>
        <Card size="sm" className="flex-row items-center gap-3 px-4">
          <ShieldAlert className="size-5 text-red-600" />
          <div>
            <p className="font-heading text-3xl font-semibold tabular-nums text-brand-900">{suspicious}</p>
            <p className="text-xs text-muted-foreground">suspicious (score ≥ 70)</p>
          </div>
        </Card>
        <Card size="sm" className="flex-row items-center gap-3 px-4">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <div>
            <p className="font-heading text-3xl font-semibold tabular-nums text-brand-900">{decidedInApp}</p>
            <p className="text-xs text-muted-foreground">decisions recorded in the app</p>
          </div>
        </Card>
      </div>

      <Card className="py-0">
        <div className="flex items-center gap-2 border-b p-3">
          <FilterSelect label="Risk level" value={risk} onChange={setRisk} options={RISK_OPTIONS} />
          <span className="ml-auto text-xs text-muted-foreground">Sorted by risk score, highest first</span>
        </div>
        {visible.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="Queue is clear"
            description={pending.length === 0 ? "Every flagged order has a decision." : "No pending orders match this filter."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Score</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden lg:table-cell">Main rule</TableHead>
                <TableHead className="hidden xl:table-cell">Schedules</TableHead>
                <TableHead className="pr-4 text-right">Quick action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-4">
                    <RiskBadge risk={r.risk} score={r.score} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/orders/${r.id}`} className="text-brand-600 hover:underline">
                      {r.id}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-52 truncate" title={r.customerName}>
                    {r.customerName}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDate(r.createdAt)}</TableCell>
                  <TableCell className="hidden max-w-44 truncate text-muted-foreground lg:table-cell" title={r.topRule ?? undefined}>
                    {r.topRule ?? "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex gap-1">
                      {r.schedules.map((s) => (
                        <ScheduleBadge key={s} schedule={s} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-1">
                      <QuickButton label="Approve" onClick={() => setTarget({ orderId: r.id, action: "approved" })}>
                        <CheckCircle2 className="text-emerald-600" />
                      </QuickButton>
                      <QuickButton label="Hold" onClick={() => setTarget({ orderId: r.id, action: "held" })}>
                        <PauseCircle className="text-amber-600" />
                      </QuickButton>
                      <QuickButton label="Escalate" onClick={() => setTarget({ orderId: r.id, action: "escalated" })}>
                        <ShieldAlert className="text-red-600" />
                      </QuickButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <QuickDecisionDialog orderId={target?.orderId ?? null} action={target?.action ?? null} onClose={() => setTarget(null)} />
    </>
  );
}

function QuickButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline" size="icon-sm" onClick={onClick} aria-label={label} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
