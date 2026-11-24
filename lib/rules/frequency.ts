import type { Rule, RuleResult } from "../types";

const WINDOW_DAYS = 7;
const DAY_MS = 86_400_000;

/**
 * Frequency: the customer has ordered the same product `threshold` or more times
 * within a rolling 7-day window (including this order).
 */
export const frequency: Rule = ({ order, customerHistory, products }, config) => {
  const results: RuleResult[] = [];
  const at = new Date(order.createdAt).getTime();
  const windowStart = at - WINDOW_DAYS * DAY_MS;
  const recent = customerHistory.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= windowStart && t <= at;
  });
  for (const line of order.lines) {
    const count = 1 + recent.filter((o) => o.lines.some((l) => l.productId === line.productId)).length;
    if (count < config.threshold) continue;
    const product = products[line.productId];
    results.push({
      points: Math.min(70, 45 + (count - config.threshold) * 10),
      hit: {
        ruleId: "frequency",
        title: "Order frequency",
        productId: line.productId,
        explanation: `${product?.name ?? line.productId}: ${count} orders in the last ${WINDOW_DAYS} days (limit ${config.threshold - 1}).`,
      },
    });
  }
  return results;
};
