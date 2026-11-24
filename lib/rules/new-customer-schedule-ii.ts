import type { Rule, RuleResult } from "../types";

/**
 * New customer + Schedule II: a customer onboarded less than 60 days ago orders
 * `threshold` or more units of a Schedule II product in a single line.
 */
export const newCustomerScheduleII: Rule = ({ order, customer, products }, config) => {
  if (!customer.isNew) return [];
  const results: RuleResult[] = [];
  const onboardedDays = Math.max(
    0,
    Math.round((new Date(order.createdAt).getTime() - new Date(customer.onboardedAt).getTime()) / 86_400_000),
  );
  for (const line of order.lines) {
    const product = products[line.productId];
    if (!product || product.schedule !== "II" || line.quantity < config.threshold) continue;
    results.push({
      points: 50,
      hit: {
        ruleId: "new-customer-schedule-ii",
        title: "New customer ordering Schedule II",
        productId: line.productId,
        explanation: `${product.name}: customer onboarded ${onboardedDays} days ago is ordering ${line.quantity} units of a Schedule II product (limit ${config.threshold - 1} for new accounts).`,
      },
    });
  }
  return results;
};
