"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, Gauge, Info, Loader2, RotateCcw, Save, TrendingUp, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatNumber } from "@/lib/format";
import type { RiskLevel, RuleConfig, RuleId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { previewRuleConfig, saveRuleConfig } from "./actions";

const ICON: Record<RuleId, typeof Gauge> = {
  "quantity-spike": TrendingUp,
  frequency: CalendarClock,
  "new-customer-schedule-ii": UserPlus,
  "peer-deviation": Users,
  "monthly-cap": Gauge,
};

type Counts = Record<RiskLevel, number>;

const flagged = (c: Counts) => c.review + c.suspicious;

export function RulesEditor({ current, defaults }: { current: RuleConfig[]; defaults: RuleConfig[] }) {
  const [saved, setSaved] = useState<RuleConfig[]>(current);
  const [rules, setRules] = useState<RuleConfig[]>(current);
  const [preview, setPreview] = useState<{ key: string; counts: Counts } | null>(null);
  const [baseline, setBaseline] = useState<Counts | null>(null);
  const [saving, startSaving] = useTransition();
  const rulesKey = JSON.stringify(rules);
  const dirty = rulesKey !== JSON.stringify(saved);

  // Baseline = counts with the saved configuration.
  useEffect(() => {
    let cancelled = false;
    previewRuleConfig(saved).then((c) => !cancelled && setBaseline(c));
    return () => {
      cancelled = true;
    };
  }, [saved]);

  // Live impact preview of unsaved changes (debounced).
  useEffect(() => {
    if (!dirty) return;
    let cancelled = false;
    const t = setTimeout(() => {
      previewRuleConfig(JSON.parse(rulesKey) as RuleConfig[]).then((counts) => !cancelled && setPreview({ key: rulesKey, counts }));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [rulesKey, dirty]);

  const shown = dirty ? (preview?.key === rulesKey ? preview.counts : null) : baseline;

  function patch(id: RuleId, change: Partial<RuleConfig>) {
    setRules((list) => list.map((r) => (r.id === id ? { ...r, ...change } : r)));
  }

  function onSave() {
    startSaving(async () => {
      const result = await saveRuleConfig(rules);
      setSaved(result.config);
      setRules(result.config);
      setBaseline(result.after);
      toast.success("Rule settings saved", {
        description: `Flagged orders: ${formatNumber(flagged(result.before))} → ${formatNumber(flagged(result.after))}. Dashboard, orders and import now use these thresholds.`,
      });
    });
  }

  return (
    <>
      <ImpactBar counts={shown} baseline={baseline} dirty={dirty} />
      <div className="mb-4 flex items-start gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-800">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Scoring: each rule adds points when it fires. Orders scoring <strong>40–69</strong> go to <strong>Review</strong>; <strong>70+</strong> are{" "}
          <strong>Suspicious</strong>.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {rules.map((rule) => {
          const Icon = ICON[rule.id];
          return (
            <Card key={rule.id} className={cn(!rule.enabled && "opacity-70")}>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle>{rule.title}</CardTitle>
                </div>
                <CardDescription className="pt-1">{rule.description}</CardDescription>
                <CardAction>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{rule.enabled ? "On" : "Off"}</span>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(v) => patch(rule.id, { enabled: v })}
                      aria-label={`Enable ${rule.title}`}
                    />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Label htmlFor={`th-${rule.id}`} className="mb-1.5 text-xs text-muted-foreground">
                  Threshold
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`th-${rule.id}`}
                    type="number"
                    min={0}
                    step={rule.threshold % 1 === 0 ? 1 : 0.1}
                    value={rule.threshold}
                    disabled={!rule.enabled}
                    onChange={(e) => patch(rule.id, { threshold: Number(e.target.value) })}
                    className="w-24 tabular-nums"
                  />
                  <span className="text-sm text-muted-foreground">{rule.thresholdLabel}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-background/95 py-3 backdrop-blur">
        <Button variant="outline" onClick={() => setRules(defaults)}>
          <RotateCcw /> Reset to defaults
        </Button>
        <Button onClick={onSave} disabled={!dirty || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />} Save changes
        </Button>
      </div>
    </>
  );
}

function ImpactBar({ counts, baseline, dirty }: { counts: Counts | null; baseline: Counts | null; dirty: boolean }) {
  const delta = counts && baseline ? flagged(counts) - flagged(baseline) : 0;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border bg-white px-4 py-3 text-sm">
      <span className="font-medium text-brand-900">{dirty ? "Impact of unsaved changes" : "Current results"}</span>
      {counts ? (
        <>
          <span>
            <span className="font-heading text-lg font-semibold tabular-nums text-red-700">{formatNumber(counts.suspicious)}</span>{" "}
            <span className="text-muted-foreground">suspicious</span>
          </span>
          <span>
            <span className="font-heading text-lg font-semibold tabular-nums text-amber-700">{formatNumber(counts.review)}</span>{" "}
            <span className="text-muted-foreground">review</span>
          </span>
          <span>
            <span className="font-heading text-lg font-semibold tabular-nums text-emerald-700">{formatNumber(counts.clear)}</span>{" "}
            <span className="text-muted-foreground">clear</span>
          </span>
          {dirty && baseline ? (
            <span className={cn("ml-auto font-medium", delta > 0 ? "text-red-700" : delta < 0 ? "text-emerald-700" : "text-muted-foreground")}>
              {delta === 0 ? "No change in flagged orders" : `${delta > 0 ? "+" : ""}${formatNumber(delta)} flagged orders vs. saved`}
            </span>
          ) : null}
        </>
      ) : (
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Calculating…
        </span>
      )}
    </div>
  );
}
