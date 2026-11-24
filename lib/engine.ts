// Server-side rules engine backed by the database (stage 3).
// - Reference data (customers, products, orders, inventory) is immutable at runtime, so it is loaded
//   from SQLite once per server process and kept in memory.
// - The rule configuration is read from the RuleSetting table on every request; evaluated orders are
//   cached per configuration so a page render never re-runs the rules unless the settings changed.
import "server-only";
import { prisma } from "./db";
import { createEvaluator, DEFAULT_RULE_CONFIG } from "./rules";
import type {
  Customer,
  CustomerType,
  InventoryItem,
  Order,
  OrderDraft,
  OrderEvaluation,
  Product,
  RiskLevel,
  RuleConfig,
  Schedule,
  StateCode,
} from "./types";

export interface Reference {
  customers: Customer[];
  products: Product[];
  inventory: InventoryItem[];
  drafts: (OrderDraft & { total: number })[];
}

interface EngineCache {
  reference: Promise<Reference> | null;
  evaluated: { key: string; orders: Order[]; evaluate: (d: OrderDraft) => OrderEvaluation } | null;
}

const g = globalThis as typeof globalThis & { __orderSentinelEngine?: EngineCache };
const cacheState: EngineCache = (g.__orderSentinelEngine ??= { reference: null, evaluated: null });

async function loadReference(): Promise<Reference> {
  // Lines are loaded in their own query and joined in memory: `include` would bind one parameter per
  // order, which exceeds SQLite's parameter limit.
  const [customers, products, inventory, orderRows, lineRows] = await Promise.all([
    prisma.customer.findMany({ orderBy: { id: "asc" } }),
    prisma.product.findMany({ orderBy: { id: "asc" } }),
    prisma.inventoryItem.findMany(),
    prisma.order.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.orderLine.findMany({ orderBy: { id: "asc" } }),
  ]);
  const linesByOrder = new Map<string, typeof lineRows>();
  for (const l of lineRows) {
    const list = linesByOrder.get(l.orderId) ?? [];
    list.push(l);
    linesByOrder.set(l.orderId, list);
  }
  const orders = orderRows.map((o) => ({ ...o, lines: linesByOrder.get(o.id) ?? [] }));
  return {
    customers: customers.map((c) => ({ ...c, type: c.type as CustomerType, state: c.state as StateCode })),
    products: products.map((p) => ({ ...p, schedule: p.schedule as Schedule })),
    inventory,
    drafts: orders.map((o) => ({
      id: o.id,
      customerId: o.customerId,
      createdAt: o.createdAt.toISOString(),
      total: o.total,
      lines: o.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
    })),
  };
}

export function getReference(): Promise<Reference> {
  cacheState.reference ??= loadReference().catch((e) => {
    cacheState.reference = null; // retry on next request
    throw e;
  });
  return cacheState.reference;
}

// ---------------------------------------------------------------------------
// Rule configuration (persisted)
// ---------------------------------------------------------------------------

export async function getRuleConfig(): Promise<RuleConfig[]> {
  const rows = await prisma.ruleSetting.findMany();
  const byId = new Map(rows.map((r) => [r.id, r]));
  return DEFAULT_RULE_CONFIG.map((def) => {
    const row = byId.get(def.id);
    return row ? { ...def, enabled: row.enabled, threshold: row.threshold } : { ...def };
  });
}

export async function persistRuleConfig(config: RuleConfig[]) {
  await prisma.$transaction(
    config.map((r) =>
      prisma.ruleSetting.upsert({
        where: { id: r.id },
        create: { id: r.id, enabled: r.enabled, threshold: r.threshold },
        update: { enabled: r.enabled, threshold: r.threshold },
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/** All orders (newest first) scored with the given configuration, plus an evaluator for new drafts. */
export async function getEvaluated(config: RuleConfig[]) {
  const key = JSON.stringify(config.map(({ id, enabled, threshold }) => [id, enabled, threshold]));
  if (cacheState.evaluated?.key === key) return cacheState.evaluated;
  const ref = await getReference();
  const evaluate = createEvaluator(ref.drafts, ref.customers, ref.products, config);
  const orders: Order[] = ref.drafts.map((d) => ({ ...d, ...evaluate(d) }));
  cacheState.evaluated = { key, orders, evaluate };
  return cacheState.evaluated;
}

/** Count orders per risk level for a candidate configuration without saving it. */
export async function previewCounts(config: RuleConfig[]): Promise<Record<RiskLevel, number>> {
  const ref = await getReference();
  const evaluate = createEvaluator(ref.drafts, ref.customers, ref.products, config);
  const counts: Record<RiskLevel, number> = { clear: 0, review: 0, suspicious: 0 };
  for (const d of ref.drafts) counts[evaluate(d).risk] += 1;
  return counts;
}
