// Domain types for Demo Order Sentinel. All data is fictitious.

export type Schedule = "II" | "III" | "IV" | "V";
export type CustomerType = "retail_pharmacy" | "hospital" | "clinic" | "long_term_care";
export type RiskLevel = "clear" | "review" | "suspicious";
export type ReviewStatus = "pending" | "approved" | "held" | "escalated";
export type StateCode = "FL" | "GA" | "TX" | "OH" | "NY" | "CA";

export type RuleId =
  | "quantity-spike"
  | "frequency"
  | "new-customer-schedule-ii"
  | "peer-deviation"
  | "monthly-cap";

export interface Customer {
  id: string; // CUS-0001
  name: string;
  type: CustomerType;
  city: string;
  state: StateCode;
  registrationId: string; // DEMO-XX0000000
  onboardedAt: string; // ISO date
  isNew: boolean; // onboarded < 60 days ago
}

export interface Product {
  id: string; // PRD-001
  name: string;
  ndc: string; // 00000-0000-00
  schedule: Schedule;
  unit: string; // "bottle of 100"
  unitCost: number; // USD
}

export interface OrderLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface RuleHit {
  ruleId: RuleId;
  title: string;
  explanation: string;
  productId?: string;
}

export interface Order {
  id: string; // ORD-100001
  customerId: string;
  createdAt: string; // ISO datetime
  lines: OrderLine[];
  total: number;
  // Precalculated (stages 0–1); replaced by the rules engine in stage 2
  risk: RiskLevel;
  score: number; // 0–100
  ruleHits: RuleHit[];
}

export interface InventoryItem {
  productId: string;
  onHand: number;
  reorderPoint: number;
  allocated: number;
  lastReceivedAt: string; // ISO date
}

export interface Review {
  orderId: string;
  status: ReviewStatus;
  reviewer: string | null;
  note: string;
  decidedAt: string | null; // ISO datetime
}

export interface RuleConfig {
  id: RuleId;
  title: string;
  description: string;
  enabled: boolean;
  threshold: number;
  thresholdLabel: string;
  weight: number; // points added to the score when the rule fires
}

/** One row of the SAP Business One–style ERP export used on the Import screen. */
export interface ErpExportRow {
  DocNum: string;
  DocDate: string; // MM/DD/YYYY
  CardCode: string;
  CardName: string;
  ItemCode: string;
  ItemName: string;
  Quantity: number;
  Price: number;
}

export interface ImportedRow extends ErpExportRow {
  risk: RiskLevel;
  score: number;
  ruleHits: RuleHit[];
}

// ---------------------------------------------------------------------------
// Rules engine contracts (lib/rules)
// ---------------------------------------------------------------------------

/** The parts of an order the rules engine needs (no precalculated fields). */
export type OrderDraft = Pick<Order, "id" | "customerId" | "createdAt" | "lines">;

export interface RuleInput {
  order: OrderDraft;
  customer: Customer;
  products: Record<string, Product>;
  /** This customer's orders placed before `order`, within the last 90 days. */
  customerHistory: OrderDraft[];
  /** productId → average quantity per order line among peers of the same customer type. */
  peerAverages: Record<string, number>;
}

export interface RuleResult {
  hit: RuleHit;
  points: number;
}

export type Rule = (input: RuleInput, config: RuleConfig) => RuleResult[];

export interface OrderEvaluation {
  risk: RiskLevel;
  score: number;
  ruleHits: RuleHit[];
}

// ---------------------------------------------------------------------------
// ERP import
// ---------------------------------------------------------------------------

export interface ImportIssue {
  line: number; // 1-based line in the CSV (header = 1)
  message: string;
}

export interface ImportResult {
  fileName: string;
  rows: ImportedRow[];
  issues: ImportIssue[];
  orderCount: number;
  flaggedOrderCount: number;
  /** Set when the whole file had to be rejected (e.g. missing columns). */
  fatal: string | null;
}
