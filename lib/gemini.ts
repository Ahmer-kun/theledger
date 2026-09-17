import "server-only";
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import { z } from "zod";
import { CATEGORIES, type Category, type DraftRow } from "@/types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured. Add it to .env.local.");
  return new GoogleGenerativeAI(key);
}

const CATEGORY_VALUES = [...CATEGORIES] as string[];

const LINE_ITEM_SCHEMA = {
  type: SchemaType.OBJECT as const,
  properties: {
    label: { type: SchemaType.STRING as const },
    amount: { type: SchemaType.NUMBER as const },
  },
  required: ["label", "amount"],
};

const RECEIPT_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    merchant: { type: SchemaType.STRING as const, description: "Store or business name" },
    transaction_date: {
      type: SchemaType.STRING as const,
      description: "Date as YYYY-MM-DD",
    },
    amount: { type: SchemaType.NUMBER as const, description: "Total amount, positive" },
    category: {
      type: SchemaType.STRING as const,
      format: "enum" as const,
      enum: CATEGORY_VALUES,
      nullable: true,
    },
    line_items: {
      type: SchemaType.ARRAY as const,
      nullable: true,
      items: LINE_ITEM_SCHEMA,
    },
    confidence: {
      type: SchemaType.STRING as const,
      format: "enum" as const,
      enum: ["high", "low"],
    },
    notes: { type: SchemaType.STRING as const, nullable: true },
  },
  required: ["merchant", "transaction_date", "amount", "confidence"],
};

const PDF_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    transactions: {
      type: SchemaType.ARRAY as const,
      items: {
        type: SchemaType.OBJECT as const,
        properties: {
          merchant: { type: SchemaType.STRING as const },
          transaction_date: {
            type: SchemaType.STRING as const,
            description: "Date as YYYY-MM-DD",
          },
          amount: { type: SchemaType.NUMBER as const },
          category: {
            type: SchemaType.STRING as const,
            format: "enum" as const,
            enum: CATEGORY_VALUES,
            nullable: true,
          },
        },
        required: ["merchant", "transaction_date", "amount"],
      },
    },
  },
  required: ["transactions"],
};

const RECEIPT_PROMPT = `Extract structured data from this receipt image.

Return a JSON object with:
- merchant: the store or business name
- transaction_date: the date in YYYY-MM-DD format
- amount: the total amount (positive number, no currency symbol)
- category: one of [${CATEGORY_VALUES.join(", ")}] — pick the best fit, or null if uncertain
- line_items: array of {label, amount} if itemized receipt is legible, otherwise null
- confidence: "high" if the receipt is clearly legible, "low" if any fields are uncertain or blurry
- notes: any ambiguity or issues (optional)

Return ONLY the JSON, no markdown fences.`;

const PDF_PROMPT = `Extract all transactions from this bank statement PDF.

For each transaction return: merchant (description/payee), transaction_date (YYYY-MM-DD), amount (positive for debits, negative for credits), and category (one of [${CATEGORY_VALUES.join(", ")}] or null).

Return a JSON object with a "transactions" array. Return ONLY the JSON, no markdown fences.`;

const ReceiptSchema = z.object({
  merchant: z.string(),
  transaction_date: z.string(),
  amount: z.number(),
  category: z.enum(CATEGORY_VALUES as [string, ...string[]]).nullable(),
  line_items: z
    .array(z.object({ label: z.string(), amount: z.number() }))
    .nullable(),
  confidence: z.enum(["high", "low"]),
  notes: z.string().nullable().optional(),
});

const PdfSchema = z.object({
  transactions: z.array(
    z.object({
      merchant: z.string(),
      transaction_date: z.string(),
      amount: z.number(),
      category: z.enum(CATEGORY_VALUES as [string, ...string[]]).nullable(),
    }),
  ),
});

function toDateOnly(s: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function extractFromReceiptImage(
  base64: string,
  mimeType: string,
): Promise<{ rows: DraftRow[]; confidence: "high" | "low"; notes?: string }> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECEIPT_SCHEMA,
    },
  });

  const result = await model.generateContent([
    { text: RECEIPT_PROMPT },
    { inlineData: { data: base64, mimeType } },
  ]);

  const text = result.response.text();
  const parsed = JSON.parse(text);
  const validated = ReceiptSchema.parse(parsed);

  const row: DraftRow = {
    merchant: validated.merchant.trim(),
    transaction_date: toDateOnly(validated.transaction_date) ?? validated.transaction_date,
    amount: Math.abs(validated.amount),
    category: (validated.category as Category | null) ?? null,
    line_items: validated.line_items?.map((li) => ({
      label: li.label,
      amount: Math.abs(li.amount),
    })) ?? null,
  };

  return {
    rows: [row],
    confidence: validated.confidence,
    notes: validated.notes ?? undefined,
  };
}

export async function extractFromPdf(
  base64: string,
): Promise<{ rows: DraftRow[]; confidence: "high" | "low"; notes?: string }> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: PDF_SCHEMA,
    },
  });

  const result = await model.generateContent([
    { text: PDF_PROMPT },
    { inlineData: { data: base64, mimeType: "application/pdf" } },
  ]);

  const text = result.response.text();
  const parsed = JSON.parse(text);
  const validated = PdfSchema.parse(parsed);

  const rows: DraftRow[] = validated.transactions.map((t) => ({
    merchant: t.merchant.trim(),
    transaction_date: toDateOnly(t.transaction_date) ?? t.transaction_date,
    amount: Math.abs(t.amount),
    category: (t.category as Category | null) ?? null,
    line_items: null,
  }));

  return {
    rows,
    confidence: "high",
    notes: undefined,
  };
}
