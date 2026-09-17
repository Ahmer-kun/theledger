"use server";

import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { buildContentText, embedText } from "@/lib/embeddings";
import { CATEGORIES } from "@/types";

const CATEGORY_TUPLE = [...CATEGORIES] as [string, ...string[]];

const UpdateSchema = z.object({
  id: z.string().uuid(),
  merchant: z.string().trim().min(1, "Merchant is required").max(120),
  transaction_date: z
    .string()
    .refine((s) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
      return !isNaN(new Date(`${s}T00:00:00Z`).getTime());
    }, "Enter a valid date"),
  amount: z.number().finite().refine((a) => a !== 0, "Amount must not be zero"),
  category: z.enum(CATEGORY_TUPLE).nullable(),
});

export type WriteResult = { ok: true } | { ok: false; message: string };

function toResult(error: { message?: string } | null): WriteResult {
  if (!error) return { ok: true };
  if (error.message?.includes("row-level security") || error.message?.includes("0 rows")) {
    return { ok: false, message: "That transaction doesn't exist in your account." };
  }
  return { ok: false, message: "That change didn't save. Try again in a moment." };
}

/**
 * Edit a saved transaction. Because the stored embedding is built from the
 * merchant/date/amount/category, we rebuild the content text and re-embed on
 * every edit so the ask panel reflects the correction immediately. The
 * embedding refresh is best-effort; the row edit itself must not fail with it.
 */
export async function updateTransaction(formData: FormData): Promise<WriteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const categoryRaw = String(formData.get("category") ?? "");
  const parsed = UpdateSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    merchant: String(formData.get("merchant") ?? ""),
    transaction_date: String(formData.get("transaction_date") ?? ""),
    amount: Number(formData.get("amount")),
    category: categoryRaw === "" ? null : categoryRaw,
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the fields." };
  }
  const { id, merchant, transaction_date, amount, category } = parsed.data;

  const { data: updated, error } = await supabase
    .from("receipts")
    .update({ merchant, transaction_date, amount, category })
    .eq("id", id)
    .select("id, line_items, source_type");
  if (error) return toResult(error);
  if (!updated || updated.length === 0) return toResult({ message: "0 rows" });

  try {
    const contentText = buildContentText({
      amount,
      merchant,
      category,
      transaction_date,
      line_items: updated[0].line_items ?? null,
    });
    const embedding = await embedText(contentText);
    const { error: embedError } = await supabase
      .from("transaction_embeddings")
      .update({ content_text: contentText, embedding })
      .eq("receipt_id", id);
    if (embedError) console.error("embedding refresh failed:", embedError.message);
  } catch (embedErr) {
    console.error(
      "embedding refresh failed:",
      embedErr instanceof Error ? embedErr.message : embedErr,
    );
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function deleteTransaction(formData: FormData): Promise<WriteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return { ok: false, message: "That transaction doesn't exist in your account." };
  }

  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) return toResult(error);

  revalidatePath("/");
  revalidatePath("/transactions");
  return { ok: true };
}
