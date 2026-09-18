import "server-only";
import {
  GoogleGenerativeAI,
  type EmbedContentRequest,
  type Content,
} from "@google/generative-ai";

export const EMBEDDING_DIMENSIONS = 768;

// Gemini's free-tier embeddings. `gemini-embedding-2` defaults to 3072
// dimensions, so we request `outputDimensionality: 768` to match the
// vector(768) column set up in Phase 2. Chosen over a local Python
// microservice: no separate process to deploy or keep warm, uses the same
// API key as ingestion, and stays inside free tier. (text-embedding-004 is
// not served to these API keys — 404 — hence gemini-embedding-2.)
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "gemini-embedding-2";

// Override SDK's EmbedContentRequest (it predates outputDimensionality) — the
// SDK serializes the body verbatim, so the REST API receives and honors it.
type EmbedRequest = EmbedContentRequest & { outputDimensionality?: number };

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured. Add it to .env.local.");
  return new GoogleGenerativeAI(key);
}

/**
 * A transient cold-start connect failure (ECONNRESET / "fetch failed" before
 * any HTTP response) is common for first outbound calls; retry once.
 * Biases to false to avoid masking steady-state 4xx/5xx provider errors.
 */
function isTransientNetworkError(error: unknown): boolean {
  return error instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up/i.test(error.message);
}

async function embedWithRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isTransientNetworkError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500));
    return run();
  }
}

function embedRequest(
  text: string,
  role: "user" | "model" = "user",
): EmbedRequest {
  const content: Content = { role, parts: [{ text }] };
  return { content, outputDimensionality: EMBEDDING_DIMENSIONS };
}

export async function embedText(text: string): Promise<number[]> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const response = await embedWithRetry(() => model.embedContent(embedRequest(text)));
  const embedding = response.embedding.values;
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Unexpected embedding dimension ${embedding.length} (expected ${EMBEDDING_DIMENSIONS}). Set EMBEDDING_MODEL to a compatible model.`,
    );
  }
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const response = await embedWithRetry(() =>
    model.batchEmbedContents({
      requests: texts.map((text) => embedRequest(text)),
    }),
  );
  return response.embeddings.map((e) => e.values);
}

export function buildContentText(row: {
  amount: number;
  merchant: string;
  category: string | null;
  transaction_date: string;
  line_items?: { label: string; amount: number }[] | null;
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
  const items =
    row.line_items && row.line_items.length > 0
      ? `\nItems: ${row.line_items.map((li) => `${li.label} ($${li.amount.toFixed(2)})`).join(", ")}`
      : "";
  return `${sentence}, ${month} ${day}${suffix}${items}`;
}