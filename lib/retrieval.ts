import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "./embeddings";
import { CATEGORIES, type Category } from "@/types";

export interface RetrievedTransaction {
  receipt_id: string;
  merchant: string;
  transaction_date: string;
  amount: number;
  category: string | null;
  content_text: string;
  similarity: number;
}

export interface RetrievalFilters {
  category: Category | null;
  start: string | null; // YYYY-MM-DD
  end: string | null; // YYYY-MM-DD
}

interface MatchTransactionRow {
  receipt_id: string;
  user_id: string;
  merchant: string;
  transaction_date: string;
  amount: number;
  category: string | null;
  content_text: string;
  similarity: number;
}

/**
 * Best-effort category extraction from a natural-language question.
 * Fires only on generic category words — merchant names (Uber, Netflix,
 * Trader Joe's, …) are deliberately left to semantic matching so questions
 * like "how much did I spend on Uber" aren't over-narrowed by a category.
 * Returns the canonical category label, or null when nothing matched.
 */
export function extractCategoryFilter(question: string): Category | null {
  const q = question.toLowerCase();

  const keywordMap: Array<[Category, string[]]> = [
    ["Groceries", ["groceries", "grocery", "grocery shopping", "supermarket", "produce", "farmers market"]],
    ["Food & Dining", ["dining", "food and dining", "restaurants", "restaurant", "brunch", "lunch out", "dinner out", "breakfast out", "eat out"]],
    ["Transport", ["transport", "transportation", "transit", "commute", "commuting", "parking"]],
    ["Subscriptions", ["subscription", "subscriptions", "recurring"]],
    ["Shopping", ["shopping", "clothes", "apparel", "electronics", "retail", "department store"]],
    ["Bills & Utilities", ["bills", "utilities", "electric", "electricity", "internet", "phone", "water", "rent", "mortgage", "insurance"]],
    ["Entertainment", ["movie", "movies", "cinema", "concert", "theater", "theatre", "entertainment"]],
  ];

  // Word-boundary matching: "headphones" must not fire the "phone" utility
  // keyword, and "grocery+shopping" in a merchant name shouldn't either.
  const hasWord = (keyword: string) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(q);
  };

  for (const [category, keywords] of keywordMap) {
    if (keywords.some(hasWord)) return category;
  }
  return null;
}

const MONTHS: Array<[string, number]> = [
  ["january", 1], ["february", 2], ["march", 3], ["april", 4], ["may", 5], ["june", 6],
  ["july", 7], ["august", 8], ["september", 9], ["october", 10], ["november", 11], ["december", 12],
];

const pad = (n: number) => String(n).padStart(2, "0");

function iso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Best-effort date-range extraction from a natural-language question.
 * Understands "past N days/weeks/months", "last month", "this month",
 * and explicit months ("june", "june 2026"). Returns null when nothing
 * date-like is found so retrieval stays purely semantic.
 */
export function extractDateFilter(question: string): { start: string; end: string } | null {
  const q = question.toLowerCase();
  const now = new Date();

  // "past N days / weeks / months", "last N ..."
  const rel = q.match(/(?:past|last|previous)\s+(\d+)\s+(day|week|month)s?\b/);
  if (rel) {
    const count = Number(rel[1]);
    const unit = rel[2];
    const ms = unit === "day" ? count * 86400000 : unit === "week" ? count * 604800000 : count * 2628000000;
    const start = new Date(now.getTime() - ms);
    return {
      start: iso(start.getFullYear(), start.getMonth() + 1, start.getDate()),
      end: iso(now.getFullYear(), now.getMonth() + 1, now.getDate()),
    };
  }

  // "last month"
  if (/\blast month\b/.test(q)) {
    const y = now.getFullYear();
    const m = now.getMonth() + 1; // 1..12
    const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
    return { start: iso(prev.y, prev.m, 1), end: iso(prev.y, prev.m, lastDayOfMonth(prev.y, prev.m)) };
  }

  // "this month"
  if (/\bthis month\b/.test(q)) {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return { start: iso(y, m, 1), end: iso(y, m, now.getDate()) };
  }

  // explicit months: "june", "june 2026", "in july"
  for (const [name, monthNum] of MONTHS) {
    const withYear = q.match(new RegExp(`(?:in\\s+)?${name}(?:\\s+)?(20\\d{2})\\b`));
    let y = now.getFullYear();
    if (withYear) {
      y = Number(withYear[1]);
    } else if (new RegExp(`\\b${name}\\b`).test(q)) {
      // pick the most recent occurrence of that month at or before today
      const candidate = new Date(Date.UTC(y, monthNum - 1, 1));
      if (candidate.getTime() > now.getTime()) y -= 1;
    } else {
      continue;
    }
    return { start: iso(y, monthNum, 1), end: iso(y, monthNum, lastDayOfMonth(y, monthNum)) };
  }

  return null;
}

export interface RetrieveParams {
  supabase: SupabaseClient;
  question: string;
  limit?: number;
  /** Precomputed question embedding; when omitted, the question is embedded
   *  before search. Lets callers cache embeddings per question. */
  embedding?: number[];
}

export interface RetrieveResult {
  transactions: RetrievedTransaction[];
  filters: RetrievalFilters;
}

/**
 * Embed the question, then fetch the top-k matching transactions via the
 * `match_transactions` RPC. The RPC runs SECURITY INVOKER, so RLS keeps this
 * scoped to the signed-in user. Category/date filters extracted from the
 * question are applied inside the query so structured questions aren't
 * answered purely by semantic similarity.
 */
export async function retrieveTransactions({
  supabase,
  question,
  limit = 20,
  embedding,
}: RetrieveParams): Promise<RetrieveResult> {
  const questionEmbedding = embedding ?? (await embedText(question));

  const q = question.toLowerCase();
  const isComparison = /\b(compare|compared|vs\.?|versus|than|difference between)\b/.test(q);

  const filters: RetrievalFilters = isComparison
    ? { category: null, start: null, end: null }
    : {
        category: extractCategoryFilter(question),
        start: extractDateFilter(question)?.start ?? null,
        end: extractDateFilter(question)?.end ?? null,
      };

  const { data, error } = await supabase.rpc("match_transactions", {
    p_embedding: questionEmbedding,
    p_limit: limit,
    p_category: filters.category,
    p_start: filters.start,
    p_end: filters.end,
  });

  if (error) throw error;

  const transactions: RetrievedTransaction[] = ((data as MatchTransactionRow[] | null) ?? []).map(
    (row) => ({
      receipt_id: row.receipt_id,
      merchant: row.merchant,
      transaction_date: row.transaction_date,
      amount: Number(row.amount),
      category: row.category,
      content_text: row.content_text,
      similarity: Number(row.similarity),
    }),
  );

  return { transactions, filters };
}

export { CATEGORIES };