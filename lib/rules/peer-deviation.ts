import type { CustomerType, Rule, RuleResult } from "../types";

const TYPE_LABEL: Record<CustomerType, string> = {
  retail_pharmacy: "retail pharmacies",
  hospital: "hospitals",
  clinic: "clinics",
  long_term_care: "long-term care facilities",
};

/**
 * Peer deviation: a line's quantity is `threshold`× (or more) the average quantity
 * ordered by customers of the same type.
 */
export const peerDeviation: Rule = ({ order, customer, peerAverages, products }, config) => {
  const results: RuleResult[] = [];
  for (const line of order.lines) {
    const peerAvg = peerAverages[line.productId];
    if (!peerAvg) continue;
    const ratio = line.quantity / peerAvg;
    if (ratio < config.threshold) continue;
    const product = products[line.productId];
    results.push({
      points: Math.min(70, Math.round(40 + (ratio - config.threshold) * 10)),
      hit: {
        ruleId: "peer-deviation",
        title: "Peer deviation",
        productId: line.productId,
        explanation: `${product?.name ?? line.productId}: ordered ${line.quantity}, which is ${ratio.toFixed(1)}× the average of other ${TYPE_LABEL[customer.type]} (avg ${peerAvg.toFixed(1)}).`,
      },
    });
  }
  return results;
};
