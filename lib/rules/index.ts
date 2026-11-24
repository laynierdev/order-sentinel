import type {
  Customer,
  OrderDraft,
  OrderEvaluation,
  Product,
  RiskLevel,
  Rule,
  RuleConfig,
  RuleHit,
  RuleId,
  RuleInput,
} from "../types";
import { frequency } from "./frequency";
import { monthlyCap } from "./monthly-cap";
import { newCustomerScheduleII } from "./new-customer-schedule-ii";
import { peerDeviation } from "./peer-deviation";
import { quantitySpike } from "./quantity-spike";

export const SUSPICIOUS_MIN = 70;
export const REVIEW_MIN = 40;

export const RULES: Record<RuleId, Rule> = {
  "quantity-spike": quantitySpike,
  frequency,
  "new-customer-schedule-ii": newCustomerScheduleII,
  "peer-deviation": peerDeviation,
  "monthly-cap": monthlyCap,
};

export const DEFAULT_RULE_CONFIG: RuleConfig[] = [
  {
    id: "quantity-spike",
    title: "Quantity spike",
    description: "Flags a line when the quantity is far above the customer's own 90-day average for that product.",
    enabled: true,
    threshold: 2,
    thresholdLabel: "× customer's 90-day average",
    weight: 40,
  },
  {
    id: "frequency",
    title: "Order frequency",
    description: "Flags repeated orders of the same product within a rolling 7-day window.",
    enabled: true,
    threshold: 4,
    thresholdLabel: "orders of the same product in 7 days",
    weight: 45,
  },
  {
    id: "new-customer-schedule-ii",
    title: "New customer + Schedule II",
    description: "Flags customers onboarded less than 60 days ago ordering Schedule II products in volume.",
    enabled: true,
    threshold: 10,
    thresholdLabel: "units of a Schedule II product per line",
    weight: 50,
  },
  {
    id: "peer-deviation",
    title: "Peer deviation",
    description: "Flags a line when the quantity is far above what customers of the same type usually order.",
    enabled: true,
    threshold: 2.5,
    thresholdLabel: "× peer group average",
    weight: 40,
  },
  {
    id: "monthly-cap",
    title: "Monthly cap",
    description:
      "Flags Schedule II products once month-to-date volume exceeds the configured cap (scaled by customer type).",
    enabled: true,
    threshold: 60,
    thresholdLabel: "units per Schedule II product per month (retail)",
    weight: 45,
  },
];

export function riskFromScore(score: number): RiskLevel {
  if (score >= SUSPICIOUS_MIN) return "suspicious";
  if (score >= REVIEW_MIN) return "review";
  return "clear";
}

/**
 * Runs every enabled rule. Score = sum over rules of the strongest hit of each rule, capped at 100.
 */
export function evaluateOrder(input: RuleInput, configs: RuleConfig[] = DEFAULT_RULE_CONFIG): OrderEvaluation {
  let score = 0;
  const ruleHits: RuleHit[] = [];
  for (const config of configs) {
    if (!config.enabled) continue;
    const results = RULES[config.id](input, config);
    if (results.length === 0) continue;
    score += Math.max(...results.map((r) => r.points));
    ruleHits.push(...results.map((r) => r.hit));
  }
  score = Math.min(100, Math.round(score));
  return { score, risk: riskFromScore(score), ruleHits };
}

// ---------------------------------------------------------------------------
// Helpers to build rule inputs from a set of orders
// ---------------------------------------------------------------------------

const HISTORY_DAYS = 90;
const DAY_MS = 86_400_000;

interface Agg {
  sum: number;
  count: number;
}

function addTo(map: Map<string, Agg>, key: string, quantity: number) {
  const a = map.get(key) ?? { sum: 0, count: 0 };
  a.sum += quantity;
  a.count += 1;
  map.set(key, a);
}

/**
 * Prepares lookups once and returns a function that evaluates any order draft
 * (existing or imported) against the given order history.
 */
export function createEvaluator(
  history: OrderDraft[],
  customers: Customer[],
  products: Product[],
  configs: RuleConfig[] = DEFAULT_RULE_CONFIG,
) {
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const productById: Record<string, Product> = Object.fromEntries(products.map((p) => [p.id, p]));

  // Per-customer history sorted by date.
  const byCustomer = new Map<string, OrderDraft[]>();
  for (const o of history) {
    const list = byCustomer.get(o.customerId) ?? [];
    list.push(o);
    byCustomer.set(o.customerId, list);
  }
  for (const list of byCustomer.values()) list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Quantity aggregates per type/product and per customer/product (peer averages exclude the customer itself).
  const typeAgg = new Map<string, Agg>();
  const custAgg = new Map<string, Agg>();
  for (const o of history) {
    const customer = customerById.get(o.customerId);
    if (!customer) continue;
    for (const l of o.lines) {
      addTo(typeAgg, `${customer.type}|${l.productId}`, l.quantity);
      addTo(custAgg, `${o.customerId}|${l.productId}`, l.quantity);
    }
  }

  const peerCache = new Map<string, Record<string, number>>();
  function peerAveragesFor(customer: Customer): Record<string, number> {
    const cached = peerCache.get(customer.id);
    if (cached) return cached;
    const result: Record<string, number> = {};
    for (const p of products) {
      const t = typeAgg.get(`${customer.type}|${p.id}`);
      if (!t) continue;
      const c = custAgg.get(`${customer.id}|${p.id}`) ?? { sum: 0, count: 0 };
      const count = t.count - c.count;
      if (count > 0) result[p.id] = (t.sum - c.sum) / count;
    }
    peerCache.set(customer.id, result);
    return result;
  }

  return function evaluate(order: OrderDraft): OrderEvaluation {
    const customer = customerById.get(order.customerId);
    if (!customer) return { score: 0, risk: "clear", ruleHits: [] };
    const at = order.createdAt;
    const from = new Date(new Date(at).getTime() - HISTORY_DAYS * DAY_MS).toISOString();
    const customerHistory = (byCustomer.get(order.customerId) ?? []).filter(
      (o) => o.id !== order.id && o.createdAt < at && o.createdAt >= from,
    );
    return evaluateOrder(
      { order, customer, products: productById, customerHistory, peerAverages: peerAveragesFor(customer) },
      configs,
    );
  };
}
