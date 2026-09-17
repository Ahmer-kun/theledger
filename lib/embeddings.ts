export const EMBEDDING_DIMENSIONS = 768;

export function buildContentText(row: {
  amount: number;
  merchant: string;
  category: string | null;
  transaction_date: string;
}): string {
  const date = new Date(row.transaction_date + "T00:00:00Z");
  const month = date.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const day = date.getUTCDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";

  const sentence = `Spent $${row.amount.toFixed(2)} at ${row.merchant}${
    row.category ? ` on ${row.category}` : ""
  }`;
  return `${sentence}, ${month} ${day}${suffix}`;
}

export async function embedText(_text: string): Promise<number[]> {
  throw new Error("Embedding generation is implemented in Phase 4.");
}
