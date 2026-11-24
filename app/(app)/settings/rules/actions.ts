"use server";

import { revalidatePath } from "next/cache";
import { getRuleConfig, persistRuleConfig, previewCounts } from "@/lib/engine";
import { DEFAULT_RULE_CONFIG } from "@/lib/rules";
import type { RiskLevel, RuleConfig } from "@/lib/types";

/** Accept only known rules; clamp thresholds to sane positive values. Everything else comes from the defaults. */
function sanitize(input: RuleConfig[]): RuleConfig[] {
  const list = Array.isArray(input) ? input : [];
  return DEFAULT_RULE_CONFIG.map((def) => {
    const incoming = list.find((r) => r?.id === def.id);
    const threshold = Number(incoming?.threshold);
    return {
      ...def,
      enabled: typeof incoming?.enabled === "boolean" ? incoming.enabled : def.enabled,
      threshold: Number.isFinite(threshold) && threshold > 0 ? Math.min(threshold, 10_000) : def.threshold,
    };
  });
}

export async function previewRuleConfig(input: RuleConfig[]): Promise<Record<RiskLevel, number>> {
  return previewCounts(sanitize(input));
}

export async function saveRuleConfig(input: RuleConfig[]) {
  const before = await previewCounts(await getRuleConfig());
  const next = sanitize(input);
  await persistRuleConfig(next);
  revalidatePath("/", "layout");
  return { before, after: await previewCounts(next), config: next };
}
