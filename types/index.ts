export type SourceType = "receipt" | "statement";

export type SourceFormat = "image" | "csv" | "pdf";

export type VerificationStatus = "auto" | "verified" | "flagged";

export interface SourceRecord {
  id: string;
  user_id: string;
  type: SourceType;
  filename: string;
  storage_path: string | null;
  format: SourceFormat;
  status: VerificationStatus;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  source_id: string | null;
  merchant: string;
  date: string;
  amount: number;
  category: string | null;
  description: string | null;
  embedding: number[] | null;
  created_at: string;
}