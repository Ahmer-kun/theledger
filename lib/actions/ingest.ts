"use server";

import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { buildContentText } from "@/lib/embeddings";
import {
  MAX_FILE_SIZE,
  inferFileKind,
  sanitizeFileName,
  parseStatementCsv,
  type FileKind,
} from "@/lib/ingestion";
import { extractFromReceiptImage, extractFromPdf } from "@/lib/gemini";
import { CATEGORIES, type DraftRow } from "@/types";

export type UploadFileResult =
  | { phase: "error"; message: string }
  | { phase: "uploaded"; storagePath: string; kind: FileKind; filename: string };

export type ExtractResult =
  | { phase: "error"; message: string }
  | {
      phase: "review";
      storagePath: string;
      sourceType: "receipt" | "statement_line";
      filename: string;
      rows: DraftRow[];
      confidence: "high" | "low";
      notes?: string;
      skipped?: { line: number; reason: string }[];
    };

export type SaveResult =
  | { phase: "error"; message: string }
  | { phase: "saved"; count: number; preview: string };

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

const CATEGORY_TUPLE = [...CATEGORIES] as [string, ...string[]];

const DraftRowSchema = z.object({
  merchant: z.string().trim().min(1, "Merchant is required").max(120),
  transaction_date: z.string().refine((s) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(`${s}T00:00:00Z`);
    return !isNaN(d.getTime());
  }, "Enter a valid date"),
  amount: z.number().finite().positive("Amount must be greater than zero"),
  category: z.enum(CATEGORY_TUPLE).nullable(),
  line_items: z
    .array(z.object({ label: z.string(), amount: z.number() }))
    .nullable(),
});

const EMPTY_ROW: DraftRow = {
  merchant: "",
  transaction_date: "",
  amount: 0,
  category: null,
  line_items: null,
};

export async function uploadFile(formData: FormData): Promise<UploadFileResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { phase: "error", message: "You must be signed in to upload." };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { phase: "error", message: "No file received. Try again." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      phase: "error",
      message: "That file is larger than 8 MB. Upload a smaller one.",
    };
  }

  const kind = inferFileKind(file.type, file.name);
  if (!kind) {
    return {
      phase: "error",
      message: "Unsupported file type. Use a JPEG, PNG, or WebP image, or a CSV or PDF.",
    };
  }

  const storagePath = `${user.id}/${randomUUID()}/${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("user-files")
    .upload(storagePath, file, { upsert: false });

  if (uploadError) {
    // Storage bucket missing — surface a clear, actionable message.
    if (uploadError.message.includes("not found") || String(uploadError.statusCode) === "404") {
      return {
        phase: "error",
        message: "The storage bucket isn't set up yet. Run migration 0006_ingestion.sql, then try again.",
      };
    }
    return {
      phase: "error",
      message: "Upload failed. Try again in a moment.",
    };
  }

  return { phase: "uploaded", storagePath, kind, filename: file.name };
}

export async function extractFromStored(formData: FormData): Promise<ExtractResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { phase: "error", message: "You must be signed in." };

  const storagePath = String(formData.get("storagePath") ?? "");
  const kind = String(formData.get("kind") ?? "") as FileKind;

  if (kind !== "image" && kind !== "csv" && kind !== "pdf") {
    return { phase: "error", message: "Unknown file kind." };
  }
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { phase: "error", message: "That file doesn't belong to your account." };
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("user-files")
    .download(storagePath);
  if (downloadError || !blob) {
    return { phase: "error", message: "Couldn't read the uploaded file. Try again." };
  }

  const filename = storagePath.split("/").pop() ?? storagePath;

  if (kind === "csv") {
    const text = Buffer.from(await blob.arrayBuffer()).toString("utf-8");
    const { rows, errors } = parseStatementCsv(text);
    if (rows.length === 0) {
      const message =
        errors.length > 0
          ? errors
              .slice(0, 3)
              .map((e) => e.reason)
              .join(" ")
          : "That CSV didn't contain any rows we could read.";
      return { phase: "error", message };
    }
    return {
      phase: "review",
      storagePath,
      sourceType: "statement_line",
      filename,
      rows: rows.map((row) => ({ ...row, line_items: null })),
      confidence: "high",
      skipped: errors.length > 0 ? errors : undefined,
    };
  }

  const bytes = Buffer.from(await blob.arrayBuffer());
  const base64 = bytes.toString("base64");

  try {
    if (kind === "pdf") {
      const { rows } = await extractFromPdf(base64);
      if (rows.length === 0) {
        return { phase: "error", message: "No transactions found in that PDF." };
      }
      return {
        phase: "review",
        storagePath,
        sourceType: "statement_line",
        filename,
        rows,
        confidence: "high",
      };
    }

    const { rows, confidence, notes } = await extractFromReceiptImage(base64, fileMime(filename));
    const parsed = rows[0];
    const row: DraftRow =
      confidence === "low" || !isComplete(parsed)
        ? {
            merchant: parsed.merchant ?? "",
            transaction_date: parsed.transaction_date ?? "",
            amount: parsed.amount ?? 0,
            category: parsed.category ?? null,
            line_items: parsed.line_items ?? null,
          }
        : parsed;

    return {
      phase: "review",
      storagePath,
      sourceType: "receipt",
      filename,
      rows: [row],
      confidence,
      notes: notes ?? (confidence === "low" ? "We couldn't read this clearly — review everything below." : undefined),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
      return {
        phase: "error",
        message: "Extraction couldn't run — GEMINI_API_KEY isn't configured in .env.local.",
      };
    }
    if (kind === "image") {
      return {
        phase: "review",
        storagePath,
        sourceType: "receipt",
        filename,
        rows: [EMPTY_ROW],
        confidence: "low",
        notes: "We couldn't read this file, so nothing was filled in. Enter the details below.",
      };
    }
    return { phase: "error", message: "Extraction failed. Try a clearer file, or try again." };
  }
}

function fileMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function isComplete(row: DraftRow): boolean {
  return Boolean(row.merchant) && Boolean(row.transaction_date) && row.amount > 0;
}

export async function saveExtractions(formData: FormData): Promise<SaveResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { phase: "error", message: "You must be signed in." };

  const payloadRaw = String(formData.get("payload") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");
  const sourceType = String(formData.get("sourceType") ?? "");

  if (sourceType !== "receipt" && sourceType !== "statement_line") {
    return { phase: "error", message: "Unknown receipt type." };
  }
  if (!storagePath.startsWith(`${user.id}/`)) {
    return { phase: "error", message: "That file doesn't belong to your account." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(payloadRaw);
  } catch {
    return { phase: "error", message: "Couldn't read the receipt data. Try again." };
  }

  const parsed = z.array(DraftRowSchema).safeParse(raw);
  if (!parsed.success) {
    return {
      phase: "error",
      message: "Some fields are missing or invalid — check the form and try again.",
    };
  }

  const rows = parsed.data.filter((row) => row.merchant && row.amount > 0);
  if (rows.length === 0) {
    return { phase: "error", message: "Nothing to save." };
  }

  const { error: insertError } = await supabase.from("receipts").insert(
    rows.map((row) => ({
      user_id: user.id,
      merchant: row.merchant,
      transaction_date: row.transaction_date,
      amount: row.amount,
      category: row.category,
      line_items: row.line_items && row.line_items.length > 0 ? row.line_items : null,
      raw_file_url: storagePath,
      source_type: sourceType,
      status: "saved",
    })),
  );

  if (insertError) {
    return { phase: "error", message: "Saving failed. Try again in a moment." };
  }

  const first = rows[0];
  return {
    phase: "saved",
    count: rows.length,
    preview: buildContentText(first),
  };
}