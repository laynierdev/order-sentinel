// Formatting helpers. Dates are formatted in UTC so server and client render the same text.

/** Reference "today" for the demo dataset (data is generated up to this date). */
export const DEMO_TODAY = "2026-11-24";

const DAY_MS = 86_400_000;

export function demoToday(): Date {
  return new Date(`${DEMO_TODAY}T23:59:59.999Z`);
}

export function daysAgo(days: number, from: Date = demoToday()): Date {
  return new Date(from.getTime() - days * DAY_MS);
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "2-digit",
  day: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("en-US");

/** MM/DD/YYYY */
export function formatDate(value: string | Date): string {
  return dateFmt.format(typeof value === "string" ? new Date(value) : value);
}

/** MM/DD/YYYY, h:mm AM */
export function formatDateTime(value: string | Date): string {
  return dateTimeFmt.format(typeof value === "string" ? new Date(value) : value);
}

export function formatCurrency(value: number, wholeDollars = false): string {
  return (wholeDollars ? usd0 : usd).format(value);
}

export function formatNumber(value: number): string {
  return num.format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/** YYYY-MM-DD (UTC) — handy as a grouping key. */
export function isoDay(value: string | Date): string {
  return (typeof value === "string" ? new Date(value) : value).toISOString().slice(0, 10);
}
