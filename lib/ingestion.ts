import "server-only";
import Papa from "papaparse";
import { CATEGORIES, type Category, type StatementRow, type ParseError } from "@/types";
import {
  MAX_FILE_SIZE,
  inferFileKind,
  sanitizeFileName,
  type FileKind,
} from "@/lib/file-kind";

export { MAX_FILE_SIZE, inferFileKind, sanitizeFileName, type FileKind };

export function parseStatementCsv(csvText: string): {
  rows: StatementRow[];
  errors: ParseError[];
} {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const fields = result.meta.fields ?? [];
  const lower = fields.map((f) => f.toLowerCase().trim());

  const dateIdx = lower.findIndex((c) =>
    /^(date|posted\s*date|posting\s*date|transaction\s*date|trans\s*date|value\s*date)$/i.test(c),
  );
  const descIdx = (() => {
    const preferred = [
      "description",
      "desc",
      "payee",
      "merchant",
      "memo",
      "name",
    ];
    for (const candidate of preferred) {
      const i = lower.indexOf(candidate);
      if (i !== -1) return i;
    }
    const fallback = ["details", "detail", "transaction", "transactions", "business"];
    for (const candidate of fallback) {
      const i = lower.indexOf(candidate);
      if (i !== -1) return i;
    }
    return -1;
  })();
  const amtIdx = lower.findIndex((c) => /^(amount|trans\s*amount)$/i.test(c));
  const debitIdx = lower.findIndex((c) =>
    /^(debit|withdrawal|dr|money\s*out)$/i.test(c),
  );
  const creditIdx = lower.findIndex((c) =>
    /^(credit|deposit|cr|money\s*in)$/i.test(c),
  );

  if (
    dateIdx === -1 ||
    descIdx === -1 ||
    (amtIdx === -1 && debitIdx === -1 && creditIdx === -1)
  ) {
    return {
      rows: [],
      errors: [
        {
          line: 0,
          reason:
            "Could not find required columns (date, description, and amount). Check your CSV headers.",
        },
      ],
    };
  }

  const rows: StatementRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const dateStr = row[fields[dateIdx]]?.trim();
    const desc = row[fields[descIdx]]?.trim();

    let amountNum: number;
    if (amtIdx !== -1) {
      amountNum = parseAmount(row[fields[amtIdx]]);
    } else {
      const debit = parseAmount(row[fields[debitIdx]] ?? "0");
      const credit = parseAmount(row[fields[creditIdx]] ?? "0");
      amountNum = credit - debit;
    }

    const date = parseFlexibleDate(dateStr);
    if (!date) {
      errors.push({ line: i + 2, reason: `Invalid date: "${dateStr}"` });
      continue;
    }
    if (!desc) {
      errors.push({ line: i + 2, reason: "Empty description" });
      continue;
    }
    if (isNaN(amountNum) || amountNum === 0) {
      const sourceHeader =
        amtIdx !== -1 ? fields[amtIdx] : debitIdx !== -1 ? fields[debitIdx] : fields[creditIdx];
      errors.push({ line: i + 2, reason: `Invalid amount: "${row[sourceHeader] ?? ""}"` });
      continue;
    }

    rows.push({ merchant: desc, transaction_date: date, amount: amountNum, category: null });
  }

  return { rows, errors };
}

function parseAmount(raw?: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (cleaned === "") return 0;
  return parseFloat(cleaned);
}

function parseFlexibleDate(str?: string): string | null {
  if (!str) return null;
  const cleaned = str.trim().replace(/[-.]/g, "/");

  const isoMatch = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
    return toISO(d);
  }

  const parts = cleaned.split("/");
  if (parts.length === 3) {
    const nums = parts.map(Number);
    if (nums.some(isNaN)) return null;
    const [p1, p2, p3] = nums;
    if (p1 > 12) {
      return toISO(new Date(p3, p2 - 1, p1));
    }
    return toISO(new Date(p3, p1 - 1, p2));
  }
  return null;
}

function toISO(d: Date): string | null {
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CATEGORY_SET = new Set<string>(CATEGORIES);

export function isValidCategory(cat: string): cat is Category {
  return CATEGORY_SET.has(cat);
}
