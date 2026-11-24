// Parses a SAP Business One–style ERP export (CSV) and scores each order with the rules engine.
// Pure: the caller provides the lookups and the evaluator, so it can run from a server action or a script.
import type {
  Customer,
  ErpExportRow,
  ImportIssue,
  ImportResult,
  ImportedRow,
  OrderDraft,
  OrderEvaluation,
  Product,
} from "./types";

export const ERP_COLUMNS: (keyof ErpExportRow)[] = [
  "DocNum",
  "DocDate",
  "CardCode",
  "CardName",
  "ItemCode",
  "ItemName",
  "Quantity",
  "Price",
];

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF/LF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** MM/DD/YYYY → YYYY-MM-DD, or null if invalid. */
function parseUsDate(value: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

interface ProcessContext {
  customers: Customer[];
  products: Product[];
  evaluate: (draft: OrderDraft) => OrderEvaluation;
}

const empty = (fileName: string, fatal: string, issues: ImportIssue[] = []): ImportResult => ({
  fileName,
  rows: [],
  issues,
  orderCount: 0,
  flaggedOrderCount: 0,
  fatal,
});

export function processErpCsv(text: string, fileName: string, ctx: ProcessContext): ImportResult {
  const table = parseCsv(text);
  if (table.length < 2) return empty(fileName, "The file has no data rows.");

  const header = table[0].map((h) => h.trim().toLowerCase());
  const index = Object.fromEntries(ERP_COLUMNS.map((c) => [c, header.indexOf(c.toLowerCase())])) as Record<
    keyof ErpExportRow,
    number
  >;
  const missing = ERP_COLUMNS.filter((c) => index[c] === -1);
  if (missing.length) return empty(fileName, `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`);

  const customerById = new Map(ctx.customers.map((c) => [c.id.toLowerCase(), c]));
  const customerByName = new Map(ctx.customers.map((c) => [c.name.toLowerCase(), c]));
  const productById = new Map(ctx.products.map((p) => [p.id.toLowerCase(), p]));
  const productByName = new Map(ctx.products.map((p) => [p.name.toLowerCase(), p]));

  const issues: ImportIssue[] = [];
  interface Parsed {
    line: number;
    raw: ErpExportRow;
    customer: Customer;
    product: Product;
    isoDate: string;
  }
  const parsed: Parsed[] = [];

  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (c: keyof ErpExportRow) => (cells[index[c]] ?? "").trim();
    const isoDate = parseUsDate(get("DocDate"));
    const quantity = Number(get("Quantity"));
    const price = Number(get("Price").replace(/[$,]/g, ""));
    const customer = customerById.get(get("CardCode").toLowerCase()) ?? customerByName.get(get("CardName").toLowerCase());
    const product = productById.get(get("ItemCode").toLowerCase()) ?? productByName.get(get("ItemName").toLowerCase());
    const problems: string[] = [];
    if (!get("DocNum")) problems.push("DocNum is empty");
    if (!isoDate) problems.push(`DocDate "${get("DocDate")}" is not MM/DD/YYYY`);
    if (!Number.isInteger(quantity) || quantity <= 0) problems.push(`Quantity "${get("Quantity")}" must be a positive whole number`);
    if (!Number.isFinite(price) || price < 0) problems.push(`Price "${get("Price")}" is not a valid amount`);
    if (!customer) problems.push(`Unknown customer ${get("CardCode") || get("CardName") || "(blank)"}`);
    if (!product) problems.push(`Unknown item ${get("ItemCode") || get("ItemName") || "(blank)"}`);
    if (problems.length || !customer || !product || !isoDate) {
      issues.push({ line, message: problems.join("; ") });
      return;
    }
    parsed.push({
      line,
      isoDate,
      customer,
      product,
      raw: {
        DocNum: get("DocNum"),
        DocDate: get("DocDate"),
        CardCode: customer.id,
        CardName: customer.name,
        ItemCode: product.id,
        ItemName: product.name,
        Quantity: quantity,
        Price: price,
      },
    });
  });

  // Group lines into orders by DocNum. Lines whose customer differs from the first line are rejected.
  const groups = new Map<string, Parsed[]>();
  for (const p of parsed) {
    const group = groups.get(p.raw.DocNum) ?? [];
    if (group.length && group[0].customer.id !== p.customer.id) {
      issues.push({ line: p.line, message: `DocNum ${p.raw.DocNum} mixes customers (${group[0].customer.id} and ${p.customer.id})` });
      continue;
    }
    group.push(p);
    groups.set(p.raw.DocNum, group);
  }

  const rows: ImportedRow[] = [];
  let flaggedOrderCount = 0;
  [...groups.entries()].forEach(([docNum, lines], i) => {
    // Imported orders are placed at the end of their business day, after that day's history.
    const createdAt = new Date(`${lines[0].isoDate}T18:00:00Z`);
    createdAt.setUTCMinutes(i % 60, Math.floor(i / 60));
    const draft: OrderDraft = {
      id: `IMP-${docNum}`,
      customerId: lines[0].customer.id,
      createdAt: createdAt.toISOString(),
      lines: lines.map((l) => ({ productId: l.product.id, quantity: l.raw.Quantity, unitPrice: l.raw.Price })),
    };
    const result = ctx.evaluate(draft);
    if (result.risk !== "clear") flaggedOrderCount += 1;
    for (const l of lines) {
      const hits = result.ruleHits.filter((h) => !h.productId || h.productId === l.product.id);
      rows.push({ ...l.raw, risk: result.risk, score: result.score, ruleHits: hits.length ? hits : result.ruleHits });
    }
  });

  return { fileName, rows, issues, orderCount: groups.size, flaggedOrderCount, fatal: null };
}
