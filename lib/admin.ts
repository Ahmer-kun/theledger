import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SignupDay {
  day: string;
  count: number;
}

export interface SourceCount {
  source_type: "receipt" | "statement_line";
  count: number;
}

export interface AdminStats {
  users: {
    total: number;
    signups: SignupDay[];
  };
  receipts: {
    total: number;
    by_source: SourceCount[];
    saved: number;
    needs_review: number;
  };
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function toAdminStats(raw: unknown): AdminStats | null {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first || typeof first !== "object") return null;

  const record = first as Record<string, unknown>;
  const body =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;

  const users = body.users;
  const receipts = body.receipts;
  if (!users || typeof users !== "object") return null;
  if (!receipts || typeof receipts !== "object") return null;

  const usersRecord = users as Record<string, unknown>;
  const receiptsRecord = receipts as Record<string, unknown>;

  const signups = Array.isArray(usersRecord.signups)
    ? (usersRecord.signups as Record<string, unknown>[]).map((item) => ({
        day: String(item.day ?? ""),
        count: toNumber(item.count),
      }))
    : [];

  const by_source = Array.isArray(receiptsRecord.by_source)
    ? (receiptsRecord.by_source as Record<string, unknown>[]).map((item) => ({
        source_type: String(item.source_type) as "receipt" | "statement_line",
        count: toNumber(item.count),
      }))
    : [];

  return {
    users: { total: toNumber(usersRecord.total), signups },
    receipts: {
      total: toNumber(receiptsRecord.total),
      by_source,
      saved: toNumber(receiptsRecord.saved),
      needs_review: toNumber(receiptsRecord.needs_review),
    },
  };
}

/**
 * Aggregate-only usage stats across every account. Returns null for anyone
 * who is not an admin — the database function itself rejects the call, so
 * both this helper and the page are defense-in-depth on top of the real gate.
 */
export async function getAdminStats(
  supabase: SupabaseClient,
): Promise<AdminStats | null> {
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) return null;
  return toAdminStats(data);
}