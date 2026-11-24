# Demo Order Sentinel

Demo of a **Suspicious Order Monitoring (SOM)** tool for U.S. pharmaceutical distributors that sell controlled
substances. It scores every order with a rules engine, sends suspicious ones to a review queue, keeps an audit
trail of every decision and produces a daily inventory & SOM report.

> **All data is fictitious.** Customer names, registration numbers, NDCs and people are invented by a seeded
> generator. This is a sales demo, not a compliance product.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui (Base UI) · Recharts · lucide-react ·
Prisma 7 + SQLite (libSQL driver adapter) · `@faker-js/faker` · `tsx`

## Run it

Requirements: Node.js 20.9+ (tested with Node 24) and npm.

```bash
npm install          # also runs `prisma generate`
npm run setup        # creates prisma/dev.db, applies migrations and seeds it from /data
npm run dev          # http://localhost:3000  → sign in with the pre-filled credentials
```

Any email/password works on the login screen.

> **npm 11+/12 note:** npm may block dependency install scripts (`esbuild`, `prisma`, `@prisma/engines`) and print an
> "install-scripts" warning. The app works without them. If `tsx` or a Prisma command fails on another machine, run
> `npm install-scripts approve esbuild prisma @prisma/engines` and `npm install` again.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build / server |
| `npm run setup` | Create/update the database (migrations) and seed it from `/data` |
| `npm run db:reset` | Drop and recreate the database (interactive confirmation) |
| `npm run db:seed` | Re-load `/data/*.json` into the database (wipes decisions and rule settings) |
| `npm run db:migrate` | Create/apply a migration after editing `prisma/schema.prisma` |
| `npm run data:generate` | Regenerate `/data/*.json` and `public/samples/erp-export-sample.csv` |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` / ESLint |

### Regenerate the demo data

The generator is deterministic (seed `20261124`, business date **11/24/2026**), so it always produces the same data.

```bash
npm run data:generate   # writes /data/*.json and the sample CSV
npm run db:seed         # loads them into SQLite
```

Restart `npm run dev` after re-seeding (reference data is cached in memory per server process).

## How it works

| Area | Where |
| --- | --- |
| Domain types | `lib/types.ts` |
| Rules (pure functions) | `lib/rules/*.ts` — quantity spike, frequency, new customer + Schedule II, peer deviation, monthly cap |
| Scoring | `lib/rules/index.ts` — score = strongest hit of each rule, summed, capped at 100. **Suspicious ≥ 70**, **Review 40–69** |
| Engine + persisted settings | `lib/engine.ts` (rule settings in the `RuleSetting` table) |
| Read model per request | `lib/data.ts` (`getSnapshot()`) |
| Review decisions + audit trail | `lib/actions/review.ts` → `ReviewEvent` table (who, when, note, previous → new status) |
| ERP CSV import | `lib/import.ts` (parser + validation) and `app/(app)/import/actions.ts` |
| Database | `prisma/schema.prisma`, `prisma/seed.ts`, SQLite file `prisma/dev.db` |
| Data generator | `scripts/generate-data.ts` |

Decisions and rule settings are stored in SQLite, so they survive page reloads and server restarts. Design
decisions and QA notes are in [`QA_NOTES.md`](QA_NOTES.md).

## 5-minute demo script

Before the demo: `npm run db:seed` (clean queue, default thresholds), then `npm run dev`. Use a 1280 px+ window.

| Time | Screen | What to show |
| --- | --- | --- |
| 0:00 | **Login** | Click **Sign in**. Point at the banner: demo environment, fictitious data. |
| 0:20 | **Dashboard** | Orders today, **70 in review**, **31 suspicious pending**, 30-day flag rate. The red area is flagged orders over 90 days; the donut shows ~85% clear. *"Top alerts awaiting review"* is the analyst's worklist. |
| 1:00 | **Story 1 — Bayview Family Pharmacy** | Search `Bayview` in the top bar → open **ORD-101158**. Rules: *4 orders of oxycodone in 7 days* and *month-to-date 152 units, 153% over the cap*. The history chart shows the last two weeks in orange, roughly 3× the 90-day average. Click the customer name: the weekly chart makes the spike obvious. |
| 2:00 | **Story 2 — Lakeside Care Pharmacy (new customer)** | Search `ORD-101139`. A customer onboarded 24 days ago orders hospital volumes of oxycodone and hydromorphone on its third order. Every explanation has real numbers (*"2.9× the average of other retail pharmacies"*). Type a note, click **Escalate**, then **reload the page**: the decision and its audit trail (*Pending → Escalated*, who, when) are persisted. |
| 2:45 | **Review Queue** | Sorted by score. Show **Story 3 — Cedar Valley Regional Hospital**, **ORD-101169**: fentanyl patches 5 times in 6 days plus a quantity spike. Use the quick **Hold** action: the note is mandatory and the counter drops. |
| 3:30 | **Import** | **Use sample file** (SAP Business One export, 40 orders) → after processing, exactly **3 orders are flagged**: a quantity spike, a new customer ordering Schedule II and a clinic ordering hospital-level morphine. |
| 4:10 | **Rules** | Change *Quantity spike* from 2 to 1.5. The impact bar shows **+42 flagged orders** before saving. Explain that compliance tunes thresholds without code. Click **Reset to defaults** and do not save. |
| 4:40 | **Reports** | The Daily Inventory & SOM Report shows today's flagged orders, **the decisions you just took** and the 3 low-stock products. *Download PDF* is marked "Coming soon". |

Optional, if there is time: **Story 4 — Northside Pain & Wellness Clinic** (Customers → search *Northside*). Its
hydrocodone volume creeps past the clinic's monthly cap during November: orders that look normal one by one are
flagged by the monthly cap rule.

After the demo, run `npm run db:seed` to reset decisions and thresholds.

## Deployment (Vercel)

Live demo: **https://order-sentinel-woad.vercel.app**

```bash
vercel deploy --prod
```

`npm run vercel-build` (used by Vercel automatically) generates the Prisma client, creates and seeds `prisma/dev.db`
during the build, and `next build` ships that file with every function (`outputFileTracingIncludes`). Vercel's
filesystem is read-only, so `lib/db.ts` copies the database to `/tmp` when an instance starts.

**Persistence on Vercel is demo-grade:** decisions and rule changes live in that instance's `/tmp` copy. They can
disappear when Vercel starts a new instance (after idle time or a new deploy), and two simultaneous instances do not
share them. Every deploy starts from the clean seeded data. For durable storage, point `DATABASE_URL` at a hosted
libSQL database (e.g. Turso) — the schema and code work unchanged.
