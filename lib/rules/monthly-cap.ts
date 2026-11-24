import type { CustomerType, Rule, RuleResult } from "../types";

/** The configured cap applies to a retail pharmacy; other types scale it. */
export const MONTHLY_CAP_FACTOR: Record<CustomerType, number> = {
  retail_pharmacy: 1,
  clinic: 0.75,
  long_term_care: 1.5,
  hospital: 4,
};

/**
 * Monthly cap: month-to-date units of a Schedule II product (including this order)
 * exceed the configured cap for the customer type.
 */
export const monthlyCap: Rule = ({ order, customer, customerHistory, products }, config) => {
  const results: RuleResult[] = [];
  const month = order.createdAt.slice(0, 7); // YYYY-MM
  const cap = Math.round(config.threshold * MONTHLY_CAP_FACTOR[customer.type]);
  const sameMonth = customerHistory.filter((o) => o.createdAt.slice(0, 7) === month);
  for (const line of order.lines) {
    const product = products[line.productId];
    if (!product || product.schedule !== "II") continue;
    const mtd =
      line.quantity +
      sameMonth.reduce(
        (sum, o) => sum + o.lines.filter((l) => l.productId === line.productId).reduce((s, l) => s + l.quantity, 0),
        0,
      );
    if (mtd <= cap) continue;
    const overPct = Math.round(((mtd - cap) / cap) * 100);
    results.push({
      points: Math.min(75, 45 + Math.round(overPct / 2)),
      hit: {
        ruleId: "monthly-cap",
        title: "Monthly cap exceeded",
        productId: line.productId,
        explanation: `${product.name}: month-to-date volume is ${mtd} units, ${overPct}% over the monthly cap of ${cap}.`,
      },
    });
  }
  return results;
};
