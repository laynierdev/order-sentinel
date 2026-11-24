/**
 * Loads /data/*.json into the SQLite database. Idempotent: wipes every table first.
 *
 *   npm run db:seed        (or automatically after `prisma migrate reset`)
 */
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { DEFAULT_RULE_CONFIG } from "../lib/rules";
import type { Customer, InventoryItem, Order, Product, Review } from "../lib/types";

const DATA = join(__dirname, "..", "data");
const load = <T>(file: string): T => JSON.parse(readFileSync(join(DATA, file), "utf8")) as T;

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

async function main() {
  const customers = load<Customer[]>("customers.json");
  const products = load<Product[]>("products.json");
  const orders = load<Order[]>("orders.json");
  const inventory = load<InventoryItem[]>("inventory.json");
  const reviews = load<Review[]>("reviews.json");

  // Children first.
  await prisma.reviewEvent.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.ruleSetting.deleteMany();

  await prisma.customer.createMany({ data: customers });
  await prisma.product.createMany({ data: products });
  await prisma.order.createMany({
    data: orders.map((o) => ({ id: o.id, customerId: o.customerId, createdAt: new Date(o.createdAt), total: o.total })),
  });
  const lines = orders.flatMap((o) =>
    o.lines.map((l) => ({ orderId: o.id, productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
  );
  for (let i = 0; i < lines.length; i += 500) await prisma.orderLine.createMany({ data: lines.slice(i, i + 500) });
  await prisma.inventoryItem.createMany({ data: inventory });

  // Historical decisions become the first entries of each order's audit trail.
  const decided = reviews.filter((r) => r.status !== "pending" && r.decidedAt && r.reviewer);
  await prisma.reviewEvent.createMany({
    data: decided.map((r) => ({
      orderId: r.orderId,
      fromStatus: "pending",
      toStatus: r.status,
      reviewer: r.reviewer!,
      note: r.note,
      source: "seed",
      createdAt: new Date(r.decidedAt!),
    })),
  });

  await prisma.ruleSetting.createMany({
    data: DEFAULT_RULE_CONFIG.map((r) => ({ id: r.id, enabled: r.enabled, threshold: r.threshold })),
  });

  console.log(
    `Seeded ${customers.length} customers, ${products.length} products, ${orders.length} orders (${lines.length} lines), ` +
      `${inventory.length} inventory items, ${decided.length} review events, ${DEFAULT_RULE_CONFIG.length} rule settings.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
