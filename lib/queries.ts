import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Receipt } from "@/types";
import {
  firstOfMonthKey,
  formatMonthKey,
  lastOfMonthKey,
  monthKeyOf,
  shiftMonthKey,
  todayKey,
} from "@/lib/format";

const RECEIPT_COLUMNS =
  "id, merchant, transaction_date, amount, category, line_items, source_type, status, created_at";

interface ReceiptRow {
  id: string;
  merchant: string;
  transaction_date: string;
  amount: number | string;
  category: string | null;
  line_items: Receipt["line_items"];
  source_type: Receipt["source_type"];
  status: Receipt["status"];
  created_at: string;
}

function toReceipt(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    merchant: row.merchant,
    transaction_date: row.transaction_date,
    amount: Number(row.amount),
    category: (row.category as Category | null) ?? null,
    line_items: row.line_items ?? null,
    source_type: row.source_type,
    status: row.status,
    created_at: row.created_at,
  };
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface TrendPoint {
  key: string;
  label: string;
  total: number;
}

export interface DashboardData {
  monthKey: string;
  lastMonthKey: string;
  monthLabel: string;
  lastMonthLabel: string;
  thisMonthTotal: number;
  lastMonthTotal: number;
  byCategory: CategoryTotal[];
  trend: TrendPoint[];
  recent: Receipt[];
  totalCount: number;
}

export async function countReceipts(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("receipts")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getRecentReceipts(
  supabase: SupabaseClient,
  limit = 10,
): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select(RECEIPT_COLUMNS)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as ReceiptRow[] | null) ?? []).map(toReceipt);
}

export interface ReceiptFilters {
  q?: string;
  category?: Category | null;
  from?: string | null;
  to?: string | null;
}

export async function getFilteredReceipts(
  supabase: SupabaseClient,
  filters: ReceiptFilters,
): Promise<Receipt[]> {
  let query = supabase
    .from("receipts")
    .select(RECEIPT_COLUMNS)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.q) {
    const safe = filters.q.replace(/[%,()]/g, "");
    query = query.ilike("merchant", `%${safe}%`);
  }
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.from) query = query.gte("transaction_date", filters.from);
  if (filters.to) query = query.lte("transaction_date", filters.to);

  const { data, error } = await query;
  if (error) throw error;
  return ((data as ReceiptRow[] | null) ?? []).map(toReceipt);
}

/**
 * One bounded read (the 6-month window) powers the month totals, the category
 * breakdown and the trend, then a second small read supplies recent activity.
 */
export async function getDashboardData(
  supabase: SupabaseClient,
): Promise<DashboardData> {
  const monthKey = todayKey().slice(0, 7);
  const lastMonthKey = shiftMonthKey(monthKey, -1);
  const months = [5, 4, 3, 2, 1, 0].map((back) => shiftMonthKey(monthKey, -back));

  const { data, error } = await supabase
    .from("receipts")
    .select(RECEIPT_COLUMNS)
    .gte("transaction_date", firstOfMonthKey(months[0]))
    .lte("transaction_date", lastOfMonthKey(monthKey))
    .order("transaction_date", { ascending: true });
  if (error) throw error;

  const rows = ((data as ReceiptRow[] | null) ?? []).map(toReceipt);
  const total = (r: Receipt) => Math.abs(r.amount);

  const trend = months.map((key) => ({
    key,
    label: formatMonthKey(key),
    total: rows
      .filter((r) => monthKeyOf(r.transaction_date) === key)
      .reduce((sum, r) => sum + total(r), 0),
  }));

  const thisMonthRows = rows.filter((r) => monthKeyOf(r.transaction_date) === monthKey);
  const categoryMap = new Map<string, number>();
  for (const r of thisMonthRows) {
    const key = r.category ?? "Uncategorized";
    categoryMap.set(key, (categoryMap.get(key) ?? 0) + total(r));
  }
  const byCategory = [...categoryMap.entries()]
    .map(([category, sum]) => ({ category, total: sum }))
    .sort((a, b) => b.total - a.total);

  const [recent, totalCount] = await Promise.all([
    getRecentReceipts(supabase, 10),
    countReceipts(supabase),
  ]);

  return {
    monthKey,
    lastMonthKey,
    monthLabel: formatMonthKey(monthKey),
    lastMonthLabel: formatMonthKey(lastMonthKey),
    thisMonthTotal: thisMonthRows.reduce((sum, r) => sum + total(r), 0),
    lastMonthTotal: rows
      .filter((r) => monthKeyOf(r.transaction_date) === lastMonthKey)
      .reduce((sum, r) => sum + total(r), 0),
    byCategory,
    trend,
    recent,
    totalCount,
  };
}
