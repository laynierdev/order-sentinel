// Read model for the app (server-side only). Pages call `await getSnapshot()` once per request and use
// its helpers; client components only receive the slim, serializable rows defined here.
import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { getEvaluated, getReference, getRuleConfig } from "./engine";
import { DEMO_TODAY, daysAgo, isoDay } from "./format";
import { riskFromScore } from "./rules";
import type {
  Customer,
  CustomerType,
  InventoryItem,
  Order,
  Product,
  ReviewStatus,
  RiskLevel,
  RuleConfig,
  Schedule,
} from "./types";

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  retail_pharmacy: "Retail pharmacy",
  hospital: "Hospital",
  clinic: "Clinic",
  long_term_care: "Long-term care",
};

// ---------------------------------------------------------------------------
// Row shapes passed to client components
// ---------------------------------------------------------------------------

export interface OrderRow {
  id: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerType: CustomerType;
  total: number;
  risk: RiskLevel;
  score: number;
  schedules: Schedule[];
  /** null for orders that are clear and were never decided */
  status: ReviewStatus | null;
  lineCount: number;
  topRule: string | null;
}

export interface AuditEntry {
  id: number;
  orderId: string;
  fromStatus: ReviewStatus | null;
  toStatus: ReviewStatus;
  reviewer: string;
  note: string;
  source: "seed" | "app";
  createdAt: string;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  orders: number;
  flagged: number;
}

export interface CustomerRow {
  id: string;
  name: string;
  type: CustomerType;
  city: string;
  state: string;
  isNew: boolean;
  orders90: number;
  flagged90: number;
  pending: number;
  lastOrderAt: string | null;
  riskScore: number;
  risk: RiskLevel;
}

export interface InventoryRow extends InventoryItem {
  name: string;
  ndc: string;
  schedule: Schedule;
  unit: string;
  available: number;
  belowReorder: boolean;
  daysOfSupply: number;
}

/**
 * Cumulative customer risk = average of the customer's 5 highest order scores in the last 90 days,
 * floored at 40% of the single highest score (so one very bad order still surfaces as Review).
 */
export function customerRiskScore(list: Order[]): number {
  const scores = list.map((o) => o.score).sort((a, b) => b - a);
  const top = scores.slice(0, 5);
  while (top.length < 5) top.push(0);
  const avg = top.reduce((a, b) => a + b, 0) / 5;
  return Math.round(Math.max(avg, (scores[0] ?? 0) * 0.4));
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export class Snapshot {
  readonly customerById: Map<string, Customer>;
  readonly productById: Map<string, Product>;
  private readonly orderById: Map<string, Order>;
  private readonly auditByOrder = new Map<string, AuditEntry[]>();

  constructor(
    readonly customers: Customer[],
    readonly products: Product[],
    readonly inventory: InventoryItem[],
    /** newest first */
    readonly orders: Order[],
    readonly audit: AuditEntry[],
    readonly ruleConfig: RuleConfig[],
  ) {
    this.customerById = new Map(customers.map((c) => [c.id, c]));
    this.productById = new Map(products.map((p) => [p.id, p]));
    this.orderById = new Map(orders.map((o) => [o.id, o]));
    for (const e of audit) {
      const list = this.auditByOrder.get(e.orderId) ?? [];
      list.push(e);
      this.auditByOrder.set(e.orderId, list);
    }
  }

  getOrder(id: string) {
    return this.orderById.get(id);
  }

  getCustomer(id: string) {
    return this.customerById.get(id);
  }

  ordersForCustomer(customerId: string) {
    return this.orders.filter((o) => o.customerId === customerId);
  }

  /** Audit trail of an order, oldest first. */
  auditFor(orderId: string): AuditEntry[] {
    return this.auditByOrder.get(orderId) ?? [];
  }

  /**
   * Review status under the current rules: the latest recorded decision wins;
   * otherwise flagged orders are pending and clear orders have no status.
   */
  reviewStatus(order: Order): ReviewStatus | null {
    const trail = this.auditByOrder.get(order.id);
    if (trail?.length) return trail[trail.length - 1].toStatus;
    return order.risk === "clear" ? null : "pending";
  }

  schedulesOf(order: Order): Schedule[] {
    const set = new Set(order.lines.map((l) => this.productById.get(l.productId)?.schedule));
    return (["II", "III", "IV", "V"] as const).filter((s) => set.has(s));
  }

  toOrderRow(o: Order): OrderRow {
    const customer = this.customerById.get(o.customerId);
    return {
      id: o.id,
      createdAt: o.createdAt,
      customerId: o.customerId,
      customerName: customer?.name ?? o.customerId,
      customerType: customer?.type ?? "retail_pharmacy",
      total: o.total,
      risk: o.risk,
      score: o.score,
      schedules: this.schedulesOf(o),
      status: this.reviewStatus(o),
      lineCount: o.lines.length,
      topRule: o.ruleHits[0]?.title ?? null,
    };
  }

  orderRows(list: Order[] = this.orders): OrderRow[] {
    return list.map((o) => this.toOrderRow(o));
  }

  pendingRows(): OrderRow[] {
    return this.orderRows(this.orders.filter((o) => this.reviewStatus(o) === "pending")).sort(
      (a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt),
    );
  }

  // --- Dashboard ------------------------------------------------------------

  dailySeries(days = 90): DailyPoint[] {
    const points = new Map<string, DailyPoint>();
    for (let i = days - 1; i >= 0; i--) {
      const date = isoDay(daysAgo(i));
      points.set(date, { date, orders: 0, flagged: 0 });
    }
    for (const o of this.orders) {
      const p = points.get(isoDay(o.createdAt));
      if (!p) continue;
      p.orders += 1;
      if (o.risk !== "clear") p.flagged += 1;
    }
    return [...points.values()];
  }

  riskDistribution(): Record<RiskLevel, number> {
    const out: Record<RiskLevel, number> = { clear: 0, review: 0, suspicious: 0 };
    for (const o of this.orders) out[o.risk] += 1;
    return out;
  }

  dashboardKpis() {
    const today = this.orders.filter((o) => isoDay(o.createdAt) === DEMO_TODAY);
    const since30 = daysAgo(30).toISOString();
    const since60 = daysAgo(60).toISOString();
    const last30 = this.orders.filter((o) => o.createdAt > since30);
    const prev30 = this.orders.filter((o) => o.createdAt <= since30 && o.createdAt > since60);
    const rate = (list: Order[]) => (list.length ? list.filter((o) => o.risk !== "clear").length / list.length : 0);
    const pending = this.orders.filter((o) => this.reviewStatus(o) === "pending");
    return {
      ordersToday: today.length,
      flaggedToday: today.filter((o) => o.risk !== "clear").length,
      inReview: pending.length,
      suspiciousPending: pending.filter((o) => o.risk === "suspicious").length,
      flagRate30: rate(last30),
      flagRatePrev30: rate(prev30),
    };
  }

  // --- Customers ------------------------------------------------------------

  customerRows(): CustomerRow[] {
    return this.customers.map((c) => {
      const list = this.ordersForCustomer(c.id);
      const riskScore = customerRiskScore(list);
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        city: c.city,
        state: c.state,
        isNew: c.isNew,
        orders90: list.length,
        flagged90: list.filter((o) => o.risk !== "clear").length,
        pending: list.filter((o) => this.reviewStatus(o) === "pending").length,
        lastOrderAt: list[0]?.createdAt ?? null,
        riskScore,
        risk: riskFromScore(riskScore),
      };
    });
  }

  // --- Inventory ------------------------------------------------------------

  inventoryRows(): InventoryRow[] {
    const since30 = daysAgo(30).toISOString();
    const demand = new Map<string, number>();
    for (const o of this.orders) {
      if (o.createdAt <= since30) continue;
      for (const l of o.lines) demand.set(l.productId, (demand.get(l.productId) ?? 0) + l.quantity);
    }
    return this.inventory.flatMap((i) => {
      const p = this.productById.get(i.productId);
      if (!p) return [];
      const demand30 = demand.get(i.productId) ?? 0;
      const available = i.onHand - i.allocated;
      return [
        {
          ...i,
          name: p.name,
          ndc: p.ndc,
          schedule: p.schedule,
          unit: p.unit,
          available,
          belowReorder: i.onHand < i.reorderPoint,
          daysOfSupply: demand30 ? Math.round(available / (demand30 / 30)) : 999,
        },
      ];
    });
  }
}

/** One consistent view of the data per request (React cache dedupes calls within a render). */
export const getSnapshot = cache(async (): Promise<Snapshot> => {
  const [ref, ruleConfig, events] = await Promise.all([
    getReference(),
    getRuleConfig(),
    prisma.reviewEvent.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  ]);
  const { orders } = await getEvaluated(ruleConfig);
  const audit: AuditEntry[] = events.map((e) => ({
    id: e.id,
    orderId: e.orderId,
    fromStatus: (e.fromStatus as ReviewStatus | null) ?? null,
    toStatus: e.toStatus as ReviewStatus,
    reviewer: e.reviewer,
    note: e.note,
    source: e.source === "seed" ? "seed" : "app",
    createdAt: e.createdAt.toISOString(),
  }));
  return new Snapshot(ref.customers, ref.products, ref.inventory, orders, audit, ruleConfig);
});
