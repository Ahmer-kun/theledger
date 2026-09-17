const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const wholeCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** "$1,234.56" */
export function formatCurrency(amount: number): string {
  return currency.format(amount);
}

/** "$1,235" — used for chart ticks where cents are noise. */
export function formatCurrencyWhole(amount: number): string {
  return wholeCurrency.format(amount);
}

/** "Aug 18, 2026" from a YYYY-MM-DD date string. */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-08" from a YYYY-MM-DD date string. */
export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

/** "Aug 2026" from "2026-08". */
export function formatMonthKey(key: string): string {
  const d = new Date(`${key}-01T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The month key `delta` months from `key` (delta may be negative). */
export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function firstOfMonthKey(key: string): string {
  return `${key}-01`;
}

export function lastOfMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${key}-${String(last).padStart(2, "0")}`;
}
