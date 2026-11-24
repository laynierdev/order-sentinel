// Prisma client singleton (survives dev HMR). SQLite through the libSQL driver adapter.
import "server-only";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Local: prisma/dev.db. On Vercel the deployment filesystem is read-only, so the seeded database shipped
 * with the function is copied to /tmp on cold start. Changes there live only as long as that instance
 * (demo-grade persistence). Set DATABASE_URL (e.g. a hosted libSQL/Turso URL) for durable storage.
 */
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.VERCEL) {
    const target = "/tmp/order-sentinel.db";
    if (!existsSync(target)) copyFileSync(join(process.cwd(), "prisma", "dev.db"), target);
    return `file:${target}`;
  }
  return "file:./prisma/dev.db";
}

export const DATABASE_URL = resolveDatabaseUrl();

const g = globalThis as typeof globalThis & { __orderSentinelPrisma?: PrismaClient };

export const prisma: PrismaClient = (g.__orderSentinelPrisma ??= new PrismaClient({
  adapter: new PrismaLibSql({ url: DATABASE_URL }),
}));
