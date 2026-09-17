"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { buildContentText, embedTexts } from "@/lib/embeddings";
import { shiftMonthKey, todayKey } from "@/lib/format";
import type { Category } from "@/types";

export type DemoResult =
  | { ok: true; count: number }
  | { ok: false; message: string };

interface Template {
  merchant: string;
  day: number;
  base: number;
  category: Category;
  item?: string;
}

const TEMPLATE: Template[] = [
  { merchant: "TRADER JOE'S", day: 3, base: 52.4, category: "Groceries" },
  { merchant: "SHELL FUEL", day: 6, base: 43.7, category: "Transport" },
  { merchant: "CHIPOTLE", day: 9, base: 14.35, category: "Food & Dining" },
  { merchant: "NETFLIX", day: 12, base: 15.49, category: "Subscriptions" },
  { merchant: "AMAZON", day: 15, base: 68.9, category: "Shopping", item: "Bluetooth speaker" },
  { merchant: "COMCAST INTERNET", day: 18, base: 70, category: "Bills & Utilities" },
  { merchant: "UBER TRIP", day: 21, base: 19.2, category: "Transport" },
  { merchant: "SAFEWAY", day: 24, base: 41.15, category: "Groceries" },
  { merchant: "SPOTIFY", day: 27, base: 11.99, category: "Subscriptions" },
  { merchant: "LOCAL DINER", day: 29, base: 27.8, category: "Food & Dining" },
  { merchant: "TARGET", day: 7, base: 58.6, category: "Shopping" },
  { merchant: "BLUE BOTTLE COFFEE", day: 22, base: 7.75, category: "Food & Dining" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** ~30 realistic rows across the last 6 months, embedded so /ask works at once. */
function buildDemoRows() {
  const monthKey = todayKey().slice(0, 7);
  const todayDay = Number(todayKey().slice(8, 10));
  const rows: {
    merchant: string;
    transaction_date: string;
    amount: number;
    category: Category;
    line_items: { label: string; amount: number }[] | null;
  }[] = [];

  for (let back = 5; back >= 0; back--) {
    const key = shiftMonthKey(monthKey, -back);
    for (let i = 0; i < 5; i++) {
      const seed = back * 5 + i;
      const t = TEMPLATE[seed % TEMPLATE.length];
      const day = back === 0 ? Math.min(t.day, todayDay) : t.day;
      const factor = 0.9 + ((seed % 7) * 0.04);
      const amount = Math.round(t.base * factor * 100) / 100;
      rows.push({
        merchant: t.merchant,
        transaction_date: `${key}-${pad(day)}`,
        amount,
        category: t.category,
        line_items: t.item ? [{ label: t.item, amount }] : null,
      });
    }
  }
  return rows;
}

export async function loadDemoData(): Promise<DemoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const { count, error: countError } = await supabase
    .from("receipts")
    .select("id", { count: "exact", head: true });
  if (countError) return { ok: false, message: "Couldn't check your account. Try again." };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: "This account already has transactions — demo data only loads into an empty account.",
    };
  }

  const rows = buildDemoRows();
  const { data: inserted, error: insertError } = await supabase
    .from("receipts")
    .insert(
      rows.map((row) => ({
        user_id: user.id,
        merchant: row.merchant,
        transaction_date: row.transaction_date,
        amount: row.amount,
        category: row.category,
        line_items: row.line_items,
        source_type: "receipt",
        status: "saved",
      })),
    )
    .select("id");
  if (insertError) {
    return { ok: false, message: "Couldn't load demo data. Try again in a moment." };
  }

  try {
    const contentTexts = rows.map((row) => buildContentText(row));
    const embeddings = await embedTexts(contentTexts);
    const { error: embedError } = await supabase.from("transaction_embeddings").insert(
      rows.map((row, i) => ({
        receipt_id: inserted?.[i]?.id,
        user_id: user.id,
        embedding: embeddings[i],
        content_text: contentTexts[i],
      })),
    );
    if (embedError) console.error("demo embedding insert failed:", embedError.message);
  } catch (error) {
    console.error(
      "demo embedding generation failed:",
      error instanceof Error ? error.message : error,
    );
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/ask");
  return { ok: true, count: rows.length };
}
