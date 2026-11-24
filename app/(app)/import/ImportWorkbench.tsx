"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileWarning, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import { RiskBadge } from "@/components/orders/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { ImportResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { processImport } from "./actions";

const SAMPLE_NAME = "erp-export-sample.csv";
const STEPS = ["Reading file", "Validating columns", "Matching customers and products", "Running detection rules"];
const DURATION_MS = 2000;

type Phase = { kind: "idle" } | { kind: "processing"; fileName: string } | { kind: "done"; result: ImportResult };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ImportWorkbench() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Progress animation while the server processes the file (minimum ~2 s so every step is visible).
  useEffect(() => {
    if (phase.kind !== "processing") return;
    const started = performance.now();
    const timer = setInterval(() => setProgress(Math.min(100, ((performance.now() - started) / DURATION_MS) * 100)), 50);
    return () => clearInterval(timer);
  }, [phase]);

  async function start(fileName: string, readText: () => Promise<string>) {
    setProgress(0);
    setPhase({ kind: "processing", fileName });
    try {
      const [result] = await Promise.all([readText().then((text) => processImport(text, fileName)), sleep(DURATION_MS)]);
      setPhase({ kind: "done", result });
    } catch {
      setPhase({
        kind: "done",
        result: { fileName, rows: [], issues: [], orderCount: 0, flaggedOrderCount: 0, fatal: "The file could not be read or processed." },
      });
    }
  }

  function onUseSample() {
    void start(SAMPLE_NAME, () => fetch(`/samples/${SAMPLE_NAME}`).then((r) => r.text()));
  }

  function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) void start(file.name, () => file.text());
    if (inputRef.current) inputRef.current.value = "";
  }

  if (phase.kind === "done") return <Results result={phase.result} onReset={() => setPhase({ kind: "idle" })} />;

  if (phase.kind === "processing") {
    const step = Math.min(STEPS.length - 1, Math.floor((progress / 100) * STEPS.length));
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 py-14">
          <Loader2 className="size-8 animate-spin text-brand-600" />
          <div className="text-center">
            <p className="font-medium">Processing {phase.fileName}</p>
            <p className="text-sm text-muted-foreground">{STEPS[step]}…</p>
          </div>
          <Progress value={progress} className="w-full max-w-md" />
          <ul className="grid gap-1 text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className={cn("flex items-center gap-2", i > step ? "text-muted-foreground/60" : "text-slate-700")}>
                {i < step ? <CheckCircle2 className="size-4 text-emerald-600" /> : i === step ? <Loader2 className="size-4 animate-spin" /> : <span className="size-4" />}
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors",
            dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50",
          )}
        >
          <UploadCloud className="size-10 text-slate-400" />
          <div>
            <p className="font-medium">Drag and drop an ERP export here</p>
            <p className="text-sm text-muted-foreground">CSV from SAP Business One (DocNum, DocDate, CardCode, CardName, ItemCode, ItemName, Quantity, Price)</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              Browse files
            </Button>
            <Button onClick={onUseSample}>
              <FileSpreadsheet /> Use sample file
            </Button>
          </div>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <a href={`/samples/${SAMPLE_NAME}`} download className="text-xs text-brand-600 hover:underline">
            Download the sample CSV
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function Results({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  const { rows, fileName, issues } = result;
  if (result.fatal) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <FileWarning className="size-9 text-red-600" />
          <p className="font-medium">{fileName} could not be imported</p>
          <p className="max-w-md text-sm text-muted-foreground">{result.fatal}</p>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw /> Try another file
          </Button>
        </CardContent>
      </Card>
    );
  }
  const total = rows.reduce((s, r) => s + r.Quantity * r.Price, 0);
  const rank = { suspicious: 0, review: 1, clear: 2 } as const;
  const sorted = [...rows].sort((a, b) => rank[a.risk] - rank[b.risk] || b.score - a.score);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Summary label="File" value={fileName} />
        <Summary label="Orders imported" value={`${result.orderCount} (${rows.length} lines)`} />
        <Summary label="Flagged for review" value={String(result.flaggedOrderCount)} tone="red" />
        <Summary label="Total value" value={formatCurrency(total, true)} />
      </div>
      {issues.length ? (
        <Card size="sm" className="border-amber-200 ring-amber-200">
          <CardContent>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800">
              <AlertTriangle className="size-4" /> {issues.length} {issues.length === 1 ? "line was" : "lines were"} skipped
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-slate-700">
              {issues.map((i) => (
                <li key={i.line}>
                  <span className="font-mono text-muted-foreground">Line {i.line}:</span> {i.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Import results</CardTitle>
          <CardDescription>Flagged rows are listed first and would be added to the review queue.</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw /> Import another file
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="border-t px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">DocNum</TableHead>
                <TableHead>DocDate</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="pr-4">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={`${r.DocNum}-${r.ItemCode}`} className={r.risk === "clear" ? undefined : r.risk === "suspicious" ? "bg-red-50/60" : "bg-amber-50/60"}>
                  <TableCell className="pl-4 font-mono text-xs">{r.DocNum}</TableCell>
                  <TableCell className="tabular-nums">{r.DocDate}</TableCell>
                  <TableCell className="max-w-44">
                    <p className="truncate font-medium" title={r.CardName}>{r.CardName}</p>
                    <p className="text-xs text-muted-foreground">{r.CardCode}</p>
                  </TableCell>
                  <TableCell className="max-w-48">
                    <p className="truncate" title={r.ItemName}>{r.ItemName}</p>
                    <p className="text-xs text-muted-foreground">{r.ItemCode}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.Quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(r.Price)}</TableCell>
                  <TableCell>
                    <RiskBadge risk={r.risk} score={r.score} />
                  </TableCell>
                  <TableCell className="min-w-52 pr-4 text-xs whitespace-normal text-slate-600">
                    {r.ruleHits.length ? r.ruleHits.map((h) => h.title).join(" · ") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("mt-1 truncate text-lg font-semibold tabular-nums", tone === "red" && "text-red-700")} title={value}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
