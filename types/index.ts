export const CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Transport",
  "Subscriptions",
  "Shopping",
  "Bills & Utilities",
  "Entertainment",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type SourceType = "receipt" | "statement_line";

export type ReceiptStatus = "saved" | "needs_review";

export type SourceFormat = "image" | "csv" | "pdf";

export interface DraftRow {
  merchant: string;
  transaction_date: string;
  amount: number;
  category: Category | null;
  line_items: { label: string; amount: number }[] | null;
}

export interface StatementRow {
  merchant: string;
  transaction_date: string;
  amount: number;
  category: Category | null;
}

export interface ParseError {
  line: number;
  reason: string;
}