/**
 * Deterministic demo data generator for Demo Order Sentinel.
 * All names, IDs, NDCs and registration numbers are fictitious.
 *
 *   npm run data:generate
 */
import { faker } from "@faker-js/faker";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_TODAY, formatDate } from "../lib/format";
import { createEvaluator } from "../lib/rules";
import type {
  Customer,
  CustomerType,
  ErpExportRow,
  ImportedRow,
  InventoryItem,
  Order,
  OrderDraft,
  OrderLine,
  Product,
  Review,
  ReviewStatus,
  Schedule,
  StateCode,
} from "../lib/types";

const SEED = 20261124;
faker.seed(SEED);

const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const SAMPLES_DIR = join(ROOT, "public", "samples");

const DAY_MS = 86_400_000;
const TODAY = new Date(`${DEMO_TODAY}T00:00:00.000Z`);
const WINDOW_DAYS = 90;

// ---------------------------------------------------------------------------
// Random helpers (all driven by the seeded faker instance)
// ---------------------------------------------------------------------------

const rand = (): number => faker.number.float({ min: 0, max: 1, fractionDigits: 6 });
const between = (min: number, max: number): number => min + rand() * (max - min);
const intBetween = (min: number, max: number): number => faker.number.int({ min, max });
const chance = (p: number): boolean => rand() < p;
const pick = <T>(items: readonly T[]): T => faker.helpers.arrayElement(items);
const shuffle = <T>(items: readonly T[]): T[] => faker.helpers.shuffle([...items]);
const round2 = (n: number): number => Math.round(n * 100) / 100;

function gauss(): number {
  const u = Math.max(rand(), 1e-6);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Timestamp `daysAgo` days before TODAY at a business-hours time (UTC). */
function timestamp(daysAgo: number, hourMin = 8, hourMax = 17): string {
  const d = new Date(TODAY.getTime() - daysAgo * DAY_MS);
  d.setUTCHours(intBetween(hourMin, hourMax), intBetween(0, 59), intBetween(0, 59), 0);
  return d.toISOString();
}

function dateOnly(daysAgo: number): string {
  return new Date(TODAY.getTime() - daysAgo * DAY_MS).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Products (25): 8 × II, 6 × III, 7 × IV, 4 × V
// ---------------------------------------------------------------------------

interface ProductSeed {
  name: string;
  schedule: Schedule;
  unit: string;
  unitCost: number;
  /** Typical bottles/boxes per order line for a retail pharmacy. */
  baseQty: number;
}

const PRODUCT_SEEDS: ProductSeed[] = [
  { name: "Oxycodone HCl 10 mg tablets", schedule: "II", unit: "bottle of 100", unitCost: 48.5, baseQty: 6 },
  { name: "Oxycodone HCl 5 mg tablets", schedule: "II", unit: "bottle of 100", unitCost: 31.2, baseQty: 5 },
  { name: "Hydrocodone Bitartrate/Acetaminophen 10/325 mg tablets", schedule: "II", unit: "bottle of 100", unitCost: 22.75, baseQty: 8 },
  { name: "Morphine Sulfate ER 30 mg tablets", schedule: "II", unit: "bottle of 100", unitCost: 64.9, baseQty: 3 },
  { name: "Hydromorphone HCl 2 mg tablets", schedule: "II", unit: "bottle of 100", unitCost: 39.4, baseQty: 3 },
  { name: "Fentanyl 25 mcg/hr transdermal patches", schedule: "II", unit: "box of 5", unitCost: 88.0, baseQty: 2 },
  { name: "Methylphenidate HCl 10 mg tablets", schedule: "II", unit: "bottle of 100", unitCost: 27.6, baseQty: 5 },
  { name: "Amphetamine/Dextroamphetamine 20 mg tablets", schedule: "II", unit: "bottle of 100", unitCost: 41.3, baseQty: 6 },
  { name: "Buprenorphine/Naloxone 8/2 mg sublingual films", schedule: "III", unit: "box of 30", unitCost: 112.0, baseQty: 4 },
  { name: "Buprenorphine 8 mg sublingual tablets", schedule: "III", unit: "bottle of 30", unitCost: 58.2, baseQty: 4 },
  { name: "Acetaminophen/Codeine 300/30 mg tablets", schedule: "III", unit: "bottle of 100", unitCost: 14.8, baseQty: 6 },
  { name: "Testosterone Cypionate 200 mg/mL injection", schedule: "III", unit: "10 mL vial", unitCost: 45.0, baseQty: 3 },
  { name: "Ketamine HCl 50 mg/mL injection", schedule: "III", unit: "10 mL vial", unitCost: 19.9, baseQty: 2 },
  { name: "Dronabinol 5 mg capsules", schedule: "III", unit: "bottle of 60", unitCost: 96.5, baseQty: 2 },
  { name: "Alprazolam 1 mg tablets", schedule: "IV", unit: "bottle of 100", unitCost: 9.6, baseQty: 8 },
  { name: "Lorazepam 1 mg tablets", schedule: "IV", unit: "bottle of 100", unitCost: 11.2, baseQty: 6 },
  { name: "Clonazepam 0.5 mg tablets", schedule: "IV", unit: "bottle of 100", unitCost: 8.4, baseQty: 7 },
  { name: "Diazepam 10 mg tablets", schedule: "IV", unit: "bottle of 100", unitCost: 7.9, baseQty: 5 },
  { name: "Zolpidem Tartrate 10 mg tablets", schedule: "IV", unit: "bottle of 100", unitCost: 10.5, baseQty: 6 },
  { name: "Tramadol HCl 50 mg tablets", schedule: "IV", unit: "bottle of 100", unitCost: 8.9, baseQty: 9 },
  { name: "Carisoprodol 350 mg tablets", schedule: "IV", unit: "bottle of 100", unitCost: 12.3, baseQty: 4 },
  { name: "Pregabalin 75 mg capsules", schedule: "V", unit: "bottle of 90", unitCost: 18.6, baseQty: 6 },
  { name: "Lacosamide 100 mg tablets", schedule: "V", unit: "bottle of 60", unitCost: 74.0, baseQty: 3 },
  { name: "Promethazine/Codeine 6.25/10 mg per 5 mL oral solution", schedule: "V", unit: "473 mL bottle", unitCost: 26.4, baseQty: 3 },
  { name: "Diphenoxylate/Atropine 2.5/0.025 mg tablets", schedule: "V", unit: "bottle of 100", unitCost: 15.1, baseQty: 4 },
];

const products: Product[] = PRODUCT_SEEDS.map((p, i) => ({
  id: `PRD-${String(i + 1).padStart(3, "0")}`,
  name: p.name,
  ndc: `${faker.string.numeric(5)}-${faker.string.numeric(4)}-${faker.string.numeric(2)}`,
  schedule: p.schedule,
  unit: p.unit,
  unitCost: p.unitCost,
}));
const baseQtyByProduct = new Map(products.map((p, i) => [p.id, PRODUCT_SEEDS[i].baseQty]));
const productByName = (name: string): Product => {
  const p = products.find((x) => x.name === name);
  if (!p) throw new Error(`Unknown product ${name}`);
  return p;
};
const bySchedule = (s: Schedule) => products.filter((p) => p.schedule === s);

// ---------------------------------------------------------------------------
// Customers (60): 40 retail, 8 hospital, 8 clinic, 4 long-term care; 6 new
// ---------------------------------------------------------------------------

const CITIES: Record<StateCode, string[]> = {
  FL: ["Tampa", "Orlando", "Jacksonville", "Sarasota", "Gainesville", "Fort Myers"],
  GA: ["Atlanta", "Savannah", "Macon", "Augusta", "Athens", "Valdosta"],
  TX: ["Houston", "Austin", "San Antonio", "El Paso", "Lubbock", "Corpus Christi"],
  OH: ["Columbus", "Dayton", "Toledo", "Akron", "Cincinnati", "Youngstown"],
  NY: ["Albany", "Buffalo", "Rochester", "Syracuse", "Yonkers", "Ithaca"],
  CA: ["Fresno", "Sacramento", "San Diego", "Bakersfield", "Riverside", "Oakland"],
};
const STATES = Object.keys(CITIES) as StateCode[];

const PLACES = [
  "Oak Hollow", "Maple Ridge", "Riverbend", "Harborside", "Pinecrest", "Willow Creek", "Sunset Park",
  "Cedar Point", "Brookfield", "Stonegate", "Fairhaven", "Greenway", "Hillcrest", "Meadowbrook",
  "Northgate", "Old Mill", "Palmetto", "Quail Run", "Redstone", "Silver Lake", "Timberline",
  "Union Square", "Valley View", "Westbrook", "Amber Fields", "Blue Heron", "Copper Canyon",
  "Driftwood", "Elm Street", "Foxglove", "Ivy Lane", "Juniper Hills", "Kingsley", "Laurel Bay",
  "Mission Hills", "Northshore", "Orchard Grove", "Prairie Wind", "Sandpiper", "Three Rivers",
  "Coral Bend", "Briarwood", "Crescent Moon", "Deer Creek", "Eastwind", "Falcon Ridge", "Glenwood",
  "Hawthorne", "Ironwood", "Kestrel Point", "Lone Pine", "Magnolia Court", "Bluebonnet", "Seabreeze",
  "Twin Oaks", "Wildflower", "Aspen Grove", "Bridgewater",
];

const NAME_SUFFIX: Record<CustomerType, string[]> = {
  retail_pharmacy: ["Family Pharmacy", "Pharmacy", "Drug Store", "Apothecary", "Community Pharmacy", "Pharmacy & Wellness"],
  hospital: ["Regional Medical Center", "General Hospital", "Community Hospital"],
  clinic: ["Pain & Wellness Clinic", "Family Medicine", "Surgical Center", "Urgent Care"],
  long_term_care: ["Senior Living", "Care Center", "Nursing & Rehab"],
};

interface StorySeed {
  key: "bayview" | "lakeside" | "cedarValley" | "northside";
  name: string;
  type: CustomerType;
  state: StateCode;
  city: string;
  isNew: boolean;
}

const STORIES: StorySeed[] = [
  { key: "bayview", name: "Bayview Family Pharmacy", type: "retail_pharmacy", state: "FL", city: "Tampa", isNew: false },
  { key: "lakeside", name: "Lakeside Care Pharmacy", type: "retail_pharmacy", state: "TX", city: "Houston", isNew: true },
  { key: "cedarValley", name: "Cedar Valley Regional Hospital", type: "hospital", state: "GA", city: "Savannah", isNew: false },
  { key: "northside", name: "Northside Pain & Wellness Clinic", type: "clinic", state: "OH", city: "Columbus", isNew: false },
];

const typeSlots: CustomerType[] = shuffle([
  ...Array<CustomerType>(40).fill("retail_pharmacy"),
  ...Array<CustomerType>(8).fill("hospital"),
  ...Array<CustomerType>(8).fill("clinic"),
  ...Array<CustomerType>(4).fill("long_term_care"),
]);

// Indices of story customers: first slot of the matching type after a fixed offset.
const storyIndex = new Map<StorySeed["key"], number>();
for (const [offset, story] of [
  [6, STORIES[0]],
  [52, STORIES[1]],
  [30, STORIES[2]],
  [40, STORIES[3]],
] as const) {
  let i = offset;
  while (typeSlots[i] !== story.type || [...storyIndex.values()].includes(i)) i = (i + 1) % typeSlots.length;
  storyIndex.set(story.key, i);
}

// 6 new customers: Lakeside + 3 more retail + 1 clinic + 1 long-term care.
const newIndices = new Set<number>([storyIndex.get("lakeside")!]);
const takenStory = new Set(storyIndex.values());
for (const [type, count] of [
  ["retail_pharmacy", 3],
  ["clinic", 1],
  ["long_term_care", 1],
] as const) {
  const candidates = shuffle(
    typeSlots.map((t, i) => ({ t, i })).filter(({ t, i }) => t === type && !takenStory.has(i) && !newIndices.has(i)),
  );
  candidates.slice(0, count).forEach(({ i }) => newIndices.add(i));
}

const placePool = shuffle(PLACES);
const customers: Customer[] = typeSlots.map((type, i) => {
  const story = STORIES.find((s) => storyIndex.get(s.key) === i);
  const isNew = story ? story.isNew : newIndices.has(i);
  const state = story?.state ?? pick(STATES);
  const onboardedDaysAgo = story?.key === "lakeside" ? 26 : isNew ? intBetween(22, 55) : intBetween(400, 3000);
  return {
    id: `CUS-${String(i + 1).padStart(4, "0")}`,
    name: story?.name ?? `${placePool.pop()} ${pick(NAME_SUFFIX[type])}`,
    type,
    city: story?.city ?? pick(CITIES[state]),
    state,
    registrationId: `DEMO-${faker.string.alpha({ length: 2, casing: "upper" })}${faker.string.numeric(7)}`,
    onboardedAt: dateOnly(onboardedDaysAgo),
    isNew,
  };
});
const storyCustomer = (key: StorySeed["key"]): Customer => customers[storyIndex.get(key)!];

// ---------------------------------------------------------------------------
// Ordering patterns
// ---------------------------------------------------------------------------

interface TypeProfile {
  intervalDays: [number, number];
  basket: Record<Schedule, [number, number]>;
  includeProb: number;
  qtyMult: number;
}

const PROFILES: Record<CustomerType, TypeProfile> = {
  retail_pharmacy: { intervalDays: [3.2, 4.8], basket: { II: [2, 3], III: [1, 2], IV: [2, 3], V: [0, 1] }, includeProb: 0.45, qtyMult: 1 },
  hospital: { intervalDays: [3.4, 4.2], basket: { II: [5, 7], III: [2, 3], IV: [3, 4], V: [1, 2] }, includeProb: 0.4, qtyMult: 3.5 },
  clinic: { intervalDays: [5.5, 8], basket: { II: [1, 2], III: [1, 2], IV: [1, 3], V: [0, 1] }, includeProb: 0.55, qtyMult: 0.8 },
  long_term_care: { intervalDays: [4.5, 6.5], basket: { II: [2, 3], III: [1, 1], IV: [2, 3], V: [1, 1] }, includeProb: 0.5, qtyMult: 1.3 },
};

interface Pattern {
  customer: Customer;
  interval: number;
  /** productId → base quantity per line */
  basket: Map<string, number>;
}

function buildPattern(customer: Customer): Pattern {
  const profile = PROFILES[customer.type];
  const custFactor = between(0.75, 1.3);
  const basket = new Map<string, number>();
  for (const schedule of ["II", "III", "IV", "V"] as const) {
    const [min, max] = profile.basket[schedule];
    const count = intBetween(min, max);
    // New customers start with no Schedule II in their regular basket.
    if (customer.isNew && schedule === "II") continue;
    for (const p of shuffle(bySchedule(schedule)).slice(0, count)) {
      const base = (baseQtyByProduct.get(p.id) ?? 4) * profile.qtyMult * custFactor * between(0.8, 1.2);
      basket.set(p.id, Math.max(1, Math.round(base)));
    }
  }
  return { customer, interval: between(...profile.intervalDays), basket };
}

const patterns = new Map(customers.map((c) => [c.id, buildPattern(c)]));

// Story baskets get the products their story needs.
const OXY10 = productByName("Oxycodone HCl 10 mg tablets");
const HYDROMORPHONE = productByName("Hydromorphone HCl 2 mg tablets");
const FENTANYL = productByName("Fentanyl 25 mcg/hr transdermal patches");
const HYDROCODONE = productByName("Hydrocodone Bitartrate/Acetaminophen 10/325 mg tablets");
patterns.get(storyCustomer("bayview").id)!.basket.set(OXY10.id, 6);
patterns.get(storyCustomer("cedarValley").id)!.basket.set(FENTANYL.id, 7);
patterns.get(storyCustomer("northside").id)!.basket.set(HYDROCODONE.id, 6);

// Persistent peer outliers: a few established retail customers order one product at ~3× their peers.
const peerOutliers = shuffle(
  customers.filter((c) => c.type === "retail_pharmacy" && !c.isNew && !STORIES.some((s) => s.name === c.name)),
).slice(0, 4);
for (const c of peerOutliers) {
  const pattern = patterns.get(c.id)!;
  const productId = pick([...pattern.basket.keys()]);
  pattern.basket.set(productId, Math.round((baseQtyByProduct.get(productId) ?? 4) * between(2.8, 3.3)));
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

type Draft = { customerId: string; createdAt: string; lines: OrderLine[] };

const unitPrice = (productId: string): number => {
  const p = products.find((x) => x.id === productId)!;
  return round2(p.unitCost * 1.18);
};

function normalQty(base: number): number {
  let q = base * (1 + 0.18 * gauss());
  if (chance(0.035)) q = base * between(2.1, 2.7); // natural bump → usually "review"
  return Math.max(1, Math.round(q));
}

const drafts: Draft[] = [];
const storyKeys = new Set(STORIES.map((s) => storyCustomer(s.key).id));

for (const pattern of patterns.values()) {
  const { customer } = pattern;
  if (customer.id === storyCustomer("lakeside").id) continue; // fully scripted below
  const onboardedDaysAgo = Math.round((TODAY.getTime() - new Date(customer.onboardedAt).getTime()) / DAY_MS);
  const firstDay = Math.min(WINDOW_DAYS - 1, onboardedDaysAgo - 1);
  const basketEntries = [...pattern.basket.entries()];
  for (let day = firstDay - between(0, pattern.interval); day >= 0; day -= pattern.interval + between(-0.6, 0.6)) {
    const d = Math.round(day);
    const lines: OrderLine[] = basketEntries
      .filter(() => chance(PROFILES[customer.type].includeProb))
      .map(([productId, base]) => ({ productId, quantity: normalQty(base), unitPrice: unitPrice(productId) }));
    if (lines.length === 0) {
      const [productId, base] = pick(basketEntries);
      lines.push({ productId, quantity: normalQty(base), unitPrice: unitPrice(productId) });
    }
    drafts.push({ customerId: customer.id, createdAt: timestamp(d), lines });
  }
}

// --- Story 1: Bayview triples its oxycodone over the last two weeks -------
{
  const id = storyCustomer("bayview").id;
  // Drop its regular orders in the last 14 days and replace them with a burst.
  for (let i = drafts.length - 1; i >= 0; i--) {
    const age = (TODAY.getTime() - new Date(drafts[i].createdAt).getTime()) / DAY_MS;
    if (drafts[i].customerId === id && age < 14) drafts.splice(i, 1);
  }
  // Make sure oxycodone appears regularly before the burst so the 90-day average is solid.
  for (const d of drafts) {
    if (d.customerId === id && !d.lines.some((l) => l.productId === OXY10.id)) {
      d.lines.push({ productId: OXY10.id, quantity: normalQty(6), unitPrice: unitPrice(OXY10.id) });
    }
  }
  for (const daysAgo of [13, 11, 9, 7, 5, 3, 1]) {
    drafts.push({
      customerId: id,
      createdAt: timestamp(daysAgo),
      lines: [
        { productId: OXY10.id, quantity: Math.round(6 * between(3, 3.6)), unitPrice: unitPrice(OXY10.id) },
        ...(chance(0.5) ? [{ productId: products[14].id, quantity: normalQty(8), unitPrice: unitPrice(products[14].id) }] : []),
      ],
    });
  }
}

// --- Story 2: new customer orders hospital-level Schedule II on its 3rd order
{
  const id = storyCustomer("lakeside").id;
  const ALPRAZOLAM = productByName("Alprazolam 1 mg tablets");
  const TRAMADOL = productByName("Tramadol HCl 50 mg tablets");
  const LORAZEPAM = productByName("Lorazepam 1 mg tablets");
  const PREGABALIN = productByName("Pregabalin 75 mg capsules");
  const line = (p: Product, quantity: number): OrderLine => ({ productId: p.id, quantity, unitPrice: unitPrice(p.id) });
  drafts.push({ customerId: id, createdAt: timestamp(21), lines: [line(ALPRAZOLAM, 4), line(TRAMADOL, 5)] });
  drafts.push({ customerId: id, createdAt: timestamp(12), lines: [line(LORAZEPAM, 3), line(PREGABALIN, 4)] });
  drafts.push({ customerId: id, createdAt: timestamp(2), lines: [line(OXY10, 24), line(HYDROMORPHONE, 18)] });
}

// --- Story 3: hospital orders fentanyl patches 5 times in 6 days -----------
{
  const id = storyCustomer("cedarValley").id;
  for (const d of drafts) {
    const age = (TODAY.getTime() - new Date(d.createdAt).getTime()) / DAY_MS;
    if (d.customerId === id && age < 8) d.lines = d.lines.filter((l) => l.productId !== FENTANYL.id);
  }
  for (const d of drafts) {
    if (d.customerId === id && !d.lines.some((l) => l.productId === FENTANYL.id)) {
      if (chance(0.5)) d.lines.push({ productId: FENTANYL.id, quantity: normalQty(7), unitPrice: unitPrice(FENTANYL.id) });
    }
  }
  [6, 5, 3, 2, 0].forEach((daysAgo, i) => {
    drafts.push({
      customerId: id,
      createdAt: timestamp(daysAgo, 8, daysAgo === 0 ? 11 : 17),
      lines: [{ productId: FENTANYL.id, quantity: i === 4 ? 17 : normalQty(7), unitPrice: unitPrice(FENTANYL.id) }],
    });
  });
}

// --- Story 4: clinic creeps past its monthly hydrocodone cap in November ---
{
  const id = storyCustomer("northside").id;
  const novemberStart = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), 1)).toISOString();
  for (let i = drafts.length - 1; i >= 0; i--) {
    if (drafts[i].customerId === id && drafts[i].createdAt >= novemberStart) drafts.splice(i, 1);
  }
  for (const daysAgo of [22, 18, 14, 10, 6, 2]) {
    drafts.push({
      customerId: id,
      createdAt: timestamp(daysAgo),
      lines: [{ productId: HYDROCODONE.id, quantity: intBetween(9, 10), unitPrice: unitPrice(HYDROCODONE.id) }],
    });
  }
}

// --- Injected anomalies across the rest of the book (~6% of orders) -------
const established0 = () => customers.filter((c) => !c.isNew && !storyKeys.has(c.id));
const eligible = () =>
  drafts.filter((d) => !storyKeys.has(d.customerId) && !customers.find((c) => c.id === d.customerId)!.isNew);

// 1) Quantity spikes: 3×–6× on one line.
for (const d of shuffle(eligible().filter((x) => x.createdAt < timestamp(0, 0, 0) && x.createdAt > timestamp(75, 0, 0))).slice(0, 34)) {
  const line = pick(d.lines);
  line.quantity = Math.max(line.quantity + 3, Math.round(line.quantity * between(3, 6)));
}

// 2) Frequency bursts: 3 extra orders of the same product within 6 days.
for (const d of shuffle(eligible().filter((x) => x.createdAt > timestamp(80, 0, 0) && x.createdAt < timestamp(10, 0, 0))).slice(0, 6)) {
  const line = pick(d.lines);
  const baseAge = Math.round((TODAY.getTime() - new Date(d.createdAt).getTime()) / DAY_MS);
  for (const offset of [1, 3, 5]) {
    drafts.push({
      customerId: d.customerId,
      createdAt: timestamp(baseAge - offset),
      lines: [{ productId: line.productId, quantity: Math.max(1, Math.round(line.quantity * between(0.8, 1.2))), unitPrice: line.unitPrice }],
    });
  }
}

// 3) Other new customers ordering Schedule II in volume.
for (const c of shuffle(customers.filter((x) => x.isNew && x.id !== storyCustomer("lakeside").id)).slice(0, 2)) {
  const p = pick(bySchedule("II"));
  drafts.push({ customerId: c.id, createdAt: timestamp(intBetween(4, 15)), lines: [{ productId: p.id, quantity: intBetween(12, 16), unitPrice: unitPrice(p.id) }] });
}

// 5) Monthly cap: two established retail customers double a Schedule II product for a whole month.
const capCustomers = shuffle(
  established0().filter((c) => c.type === "retail_pharmacy" && !peerOutliers.includes(c)).map((c) => c.id),
);
for (const [c, monthsBack] of [
  [capCustomers[0], 2],
  [capCustomers[1], 1],
] as const) {
  const pattern = patterns.get(c)!;
  const scheduleII = [...pattern.basket.keys()].find((id) => products.find((p) => p.id === id)?.schedule === "II");
  if (!scheduleII) continue;
  const month = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth() - monthsBack, 1)).toISOString().slice(0, 7);
  for (const d of drafts) {
    if (d.customerId !== c || d.createdAt.slice(0, 7) !== month) continue;
    const line = d.lines.find((l) => l.productId === scheduleII);
    const qty = Math.round((pattern.basket.get(scheduleII) ?? 5) * between(2.4, 2.8));
    if (line) line.quantity = qty;
    else d.lines.push({ productId: scheduleII, quantity: qty, unitPrice: unitPrice(scheduleII) });
  }
}

// ---------------------------------------------------------------------------
// Assign IDs in chronological order, compute totals and evaluate with the rules engine
// ---------------------------------------------------------------------------

drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
const orderDrafts: OrderDraft[] = drafts.map((d, i) => ({
  id: `ORD-${100001 + i}`,
  customerId: d.customerId,
  createdAt: d.createdAt,
  lines: d.lines,
}));
const evaluate = createEvaluator(orderDrafts, customers, products);
const orders: Order[] = orderDrafts.map((d) => ({
  ...d,
  total: round2(d.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)),
  ...evaluate(d),
}));

// ---------------------------------------------------------------------------
// Reviews: ~60% of flagged orders already decided (oldest first); the rest pending
// ---------------------------------------------------------------------------

const reviewers = Array.from({ length: 4 }, () => faker.person.fullName());
const NOTES: Record<Exclude<ReviewStatus, "pending">, string[]> = {
  approved: [
    "Verified with pharmacist-in-charge; increase tied to new prescriber patients. Documentation on file.",
    "Customer provided dispensing data for the last 30 days; volume is consistent.",
    "Seasonal increase confirmed by customer. No further action required.",
    "Quantity matches a documented formulary change. Approved.",
  ],
  held: [
    "Holding shipment pending dispensing records for the last 30 days.",
    "Requested written justification from the customer; awaiting response.",
    "Shipment on hold until the customer confirms prescriber details.",
  ],
  escalated: [
    "Escalated to the compliance officer for a due diligence site visit.",
    "Pattern consistent with diversion indicators; escalated for regulatory reporting review.",
    "Escalated: customer could not explain the increase. Account flagged for investigation.",
  ],
};

const flagged = orders.filter((o) => o.risk !== "clear");
const decidedCount = Math.round(flagged.length * 0.6);
const reviews: Review[] = flagged.map((o, i) => {
  if (i >= decidedCount) return { orderId: o.id, status: "pending", reviewer: null, note: "", decidedAt: null };
  const r = rand();
  const status: Exclude<ReviewStatus, "pending"> =
    o.risk === "suspicious"
      ? r < 0.2 ? "approved" : r < 0.55 ? "held" : "escalated"
      : r < 0.7 ? "approved" : r < 0.9 ? "held" : "escalated";
  return {
    orderId: o.id,
    status,
    reviewer: pick(reviewers),
    note: pick(NOTES[status]),
    decidedAt: new Date(new Date(o.createdAt).getTime() + between(2, 30) * 3_600_000).toISOString(),
  };
});

// ---------------------------------------------------------------------------
// Inventory: 3 products below their reorder point
// ---------------------------------------------------------------------------

const last30 = orders.filter((o) => o.createdAt >= timestamp(30, 0, 0));
const lowStock = new Set(shuffle(products).slice(0, 3).map((p) => p.id));
const inventory: InventoryItem[] = products.map((p) => {
  const demand30 = last30.reduce((s, o) => s + o.lines.filter((l) => l.productId === p.id).reduce((a, l) => a + l.quantity, 0), 0);
  const daily = Math.max(1, demand30 / 30);
  const reorderPoint = Math.round(daily * 14);
  const onHand = lowStock.has(p.id) ? Math.round(reorderPoint * between(0.4, 0.85)) : Math.round(daily * between(20, 45));
  return {
    productId: p.id,
    onHand,
    reorderPoint,
    allocated: Math.round(onHand * between(0.05, 0.15)),
    lastReceivedAt: dateOnly(intBetween(3, 25)),
  };
});

// ---------------------------------------------------------------------------
// ERP export sample (SAP Business One style): 40 new orders, exactly 3 flagged
// ---------------------------------------------------------------------------

const importTime = (i: number) => {
  const d = new Date(TODAY.getTime());
  d.setUTCHours(18, i, 0, 0);
  return d.toISOString();
};

interface ImportCandidate {
  customer: Customer;
  productId: string;
  quantity: number;
}

const importRows: ImportedRow[] = [];
const usedPairs = new Set<string>();

function addImportRow(c: ImportCandidate, mustFlag: boolean): boolean {
  const key = `${c.customer.id}|${c.productId}`;
  if (usedPairs.has(key)) return false;
  const docNum = String(54001 + importRows.length);
  const draft: OrderDraft = {
    id: `IMP-${docNum}`,
    customerId: c.customer.id,
    createdAt: importTime(importRows.length),
    lines: [{ productId: c.productId, quantity: c.quantity, unitPrice: unitPrice(c.productId) }],
  };
  const result = evaluate(draft);
  if ((result.risk !== "clear") !== mustFlag) return false;
  const product = products.find((p) => p.id === c.productId)!;
  usedPairs.add(key);
  importRows.push({
    DocNum: docNum,
    DocDate: formatDate(draft.createdAt),
    CardCode: c.customer.id,
    CardName: c.customer.name,
    ItemCode: product.id,
    ItemName: product.name,
    Quantity: c.quantity,
    Price: draft.lines[0].unitPrice,
    ...result,
  });
  return true;
}

const established = customers.filter((c) => !c.isNew && !storyKeys.has(c.id));
const anomalySlots = new Set([7, 19, 31]);
for (let attempts = 0; importRows.length < 40 && attempts < 5000; attempts++) {
  const slot = importRows.length;
  if (anomalySlots.has(slot)) {
    if (slot === 7) {
      // Quantity spike at an established retail pharmacy.
      const c = pick(established.filter((x) => x.type === "retail_pharmacy"));
      const [productId, base] = pick([...patterns.get(c.id)!.basket.entries()].filter(([id]) => products.find((p) => p.id === id)?.schedule === "II"));
      addImportRow({ customer: c, productId, quantity: Math.round(base * between(4, 5)) }, true);
    } else if (slot === 19) {
      // New customer ordering Schedule II in volume.
      const c = pick(customers.filter((x) => x.isNew && x.id !== storyCustomer("lakeside").id));
      addImportRow({ customer: c, productId: productByName("Oxycodone HCl 5 mg tablets").id, quantity: intBetween(14, 18) }, true);
    } else {
      // Clinic ordering hospital volume of morphine (peer deviation).
      const c = pick(established.filter((x) => x.type === "clinic"));
      addImportRow({ customer: c, productId: productByName("Morphine Sulfate ER 30 mg tablets").id, quantity: intBetween(9, 11) }, true);
    }
    continue;
  }
  const c = pick(established);
  const [productId, base] = pick([...patterns.get(c.id)!.basket.entries()]);
  addImportRow({ customer: c, productId, quantity: Math.max(1, Math.round(base * between(0.85, 1.1))) }, false);
}

const CSV_COLUMNS: (keyof ErpExportRow)[] = ["DocNum", "DocDate", "CardCode", "CardName", "ItemCode", "ItemName", "Quantity", "Price"];
const csvEscape = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [
  CSV_COLUMNS.join(","),
  ...importRows.map((r) => CSV_COLUMNS.map((k) => csvEscape(k === "Price" ? r.Price.toFixed(2) : r[k])).join(",")),
].join("\n");

// ---------------------------------------------------------------------------
// Write files + summary
// ---------------------------------------------------------------------------

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(SAMPLES_DIR, { recursive: true });
const write = (file: string, data: unknown) => writeFileSync(join(DATA_DIR, file), `${JSON.stringify(data, null, 2)}\n`);
write("customers.json", customers);
write("products.json", products);
write("orders.json", orders);
write("inventory.json", inventory);
write("reviews.json", reviews);
writeFileSync(join(SAMPLES_DIR, "erp-export-sample.csv"), `${csv}\n`);

const count = (pred: (o: Order) => boolean) => orders.filter(pred).length;
const pct = (n: number) => `${((n / orders.length) * 100).toFixed(1)}%`;
const clear = count((o) => o.risk === "clear");
const review = count((o) => o.risk === "review");
const suspicious = count((o) => o.risk === "suspicious");
console.log(`Seed ${SEED} · reference date ${DEMO_TODAY}`);
console.log(`customers: ${customers.length} (new: ${customers.filter((c) => c.isNew).length})`);
console.log(`products:  ${products.length}`);
console.log(`orders:    ${orders.length}  clear ${clear} (${pct(clear)}) · review ${review} (${pct(review)}) · suspicious ${suspicious} (${pct(suspicious)})`);
console.log(`reviews:   ${reviews.length} (pending ${reviews.filter((r) => r.status === "pending").length})`);
console.log(`inventory: ${inventory.length} (below reorder point: ${inventory.filter((i) => i.onHand < i.reorderPoint).length})`);
console.log(`import:    ${importRows.length} rows (flagged ${importRows.filter((r) => r.risk !== "clear").length})`);
for (const s of STORIES) {
  const c = storyCustomer(s.key);
  const flaggedOrders = orders.filter((o) => o.customerId === c.id && o.risk !== "clear");
  console.log(`story ${s.key.padEnd(11)} ${c.id} ${c.name}: ${flaggedOrders.map((o) => `${o.id}=${o.risk[0]}${o.score}`).join(", ")}`);
}
