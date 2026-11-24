"use server";

import { getEvaluated, getReference, getRuleConfig } from "@/lib/engine";
import { processErpCsv } from "@/lib/import";
import type { ImportResult } from "@/lib/types";

const MAX_BYTES = 2 * 1024 * 1024;

export async function processImport(text: string, fileName: string): Promise<ImportResult> {
  const name = String(fileName ?? "").slice(0, 200) || "upload.csv";
  const fail = (fatal: string): ImportResult => ({ fileName: name, rows: [], issues: [], orderCount: 0, flaggedOrderCount: 0, fatal });
  if (typeof text !== "string" || text.length === 0) return fail("The file is empty.");
  if (text.length > MAX_BYTES) return fail("The file is larger than 2 MB.");
  const [ref, config] = await Promise.all([getReference(), getRuleConfig()]);
  const { evaluate } = await getEvaluated(config);
  return processErpCsv(text, name, { customers: ref.customers, products: ref.products, evaluate });
}
