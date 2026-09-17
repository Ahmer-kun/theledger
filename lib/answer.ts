import "server-only";
import type { RetrievedTransaction } from "./retrieval";

export const NO_DATA_ANSWER = "I don't have enough transaction data to answer that.";

// Below this cosine similarity we treat retrieval as "nothing relevant" and
// decline instead of letting the LLM guess. Tuned against eval question 10
// ("flights to Japan") in the Phase 4 eval harness.
export const MIN_RELEVANCE = 0.35;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq's current flagship on this key (llama-3.3-70b-versatile was retired);
// override via GROQ_MODEL in .env.local.
const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `You are Ledger's personal finance assistant. You answer questions about the user's spending, and you answer ONLY from the transaction list the user provides.

Rules:
- Never invent a merchant, date, amount, total, or category. Every number you state must be traceable to a transaction in the list.
- When you use a transaction, cite it inline as (merchant, MM/DD/YY, $amount).
- If the transaction list contains nothing relevant to the question, reply with exactly: "I don't have enough transaction data to answer that."
- If the question asks for a calculation (totals, category breakdowns, month-over-month changes), compute it from the listed transactions and briefly show which transactions you summed.
- Ignore transactions the question doesn't ask about.
- Keep answers short and direct. Never answer from general knowledge about spending.`;

interface GroqChoice {
  message: { content: string };
}

export type AnswerResult =
  | { kind: "answer"; answer: string; model: string | null; usedCount: number }
  | { kind: "no-data"; answer: string; model: null; usedCount: number };

/**
 * Grounded generation: the retrieved transactions are handed to Groq with a
 * strict no-fabrication system prompt. We short-circuit with a deterministic
 * decline when (a) retrieval returned nothing at all, or (b) even the most
 * similar hit is well below a relevance threshold — in both cases the model
 * is never asked to answer from irrelevant data.
 */
export async function generateAnswer(
  question: string,
  transactions: RetrievedTransaction[],
): Promise<AnswerResult> {
  const topSimilarity =
    transactions.length > 0
      ? Math.max(...transactions.map((t) => t.similarity))
      : 0;

  if (transactions.length === 0 || topSimilarity < MIN_RELEVANCE) {
    return { kind: "no-data", answer: NO_DATA_ANSWER, model: null, usedCount: 0 };
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured. Add it to .env.local.");
  }

  const transactionsBlock = transactions
    .map((t, i) => {
      const date = new Date(t.transaction_date + "T00:00:00Z");
      const cited = `${t.merchant}, ${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCFullYear()).slice(2)}, $${Number(t.amount).toFixed(2)}`;
      return `${i + 1}. ${t.content_text}  (category: ${t.category ?? "unset"}, similarity: ${t.similarity.toFixed(3)}, citation: ${cited})`;
    })
    .join("\n");

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Transactions:\n${transactionsBlock}\n\nQuestion: ${question}\n\nAnswer directly, citing as instructed.` },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const json = (await response.json()) as { choices?: GroqChoice[] };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Groq returned an empty answer.");

  return { kind: "answer", answer: content, model: GROQ_MODEL, usedCount: transactions.length };
}