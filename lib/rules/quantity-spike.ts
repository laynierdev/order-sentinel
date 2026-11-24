import type { Rule, RuleResult } from "../types";

/** Minimum number of prior orders of a product before we trust the customer's average. */
const MIN_HISTORY = 3;

/**
 * Quantity spike: a line's quantity is `threshold`× (or more) the customer's own
 * average for that product over the prior 90 days.
 */
export const quantitySpike: Rule = ({ order, customerHistory, products }, config) => {
  const results: RuleResult[] = [];
  for (const line of order.lines) {
    const prior = customerHistory.flatMap((o) =>
      o.lines.filter((l) => l.productId === line.productId).map((l) => l.quantity),
    );
    if (prior.length < MIN_HISTORY) continue;
    const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
    const ratio = line.quantity / avg;
    if (ratio < config.threshold) continue;
    const pctAbove = Math.round((ratio - 1) * 100);
    const product = products[line.productId];
    results.push({
      points: Math.min(90, Math.round(40 + (ratio - config.threshold) * 15)),
      hit: {
        ruleId: "quantity-spike",
        title: "Quantity spike",
        productId: line.productId,
        explanation: `${product?.name ?? line.productId}: quantity is ${pctAbove}% above this customer's 90-day average (avg ${avg.toFixed(1)}, ordered ${line.quantity}).`,
      },
    });
  }
  return results;
};
