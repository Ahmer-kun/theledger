import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { retrieveTransactions } from "@/lib/retrieval";
import { generateAnswer } from "@/lib/answer";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  const limited = rateLimit("ask", user.id);
  if (!limited.ok) {
    return Response.json(
      { error: "You're asking a lot right now. Wait a few seconds and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  let question: unknown;
  let requestedLimit: unknown;
  try {
    const body = await request.json();
    question = body?.question;
    requestedLimit = body?.limit;
  } catch {
    return Response.json({ error: "Send a JSON body with a question field." }, { status: 400 });
  }

  if (typeof question !== "string" || question.trim().length === 0) {
    return Response.json({ error: "Question must be a non-empty string." }, { status: 400 });
  }
  if (question.length > 500) {
    return Response.json({ error: "Question is too long (max 500 characters)." }, { status: 400 });
  }

  const limit =
    typeof requestedLimit === "number" && Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.floor(requestedLimit), 1), 50)
      : 30;

  try {
    const { transactions, filters } = await retrieveTransactions({
      supabase,
      question: question.trim(),
      limit,
    });

    const result = await generateAnswer(question.trim(), transactions);

    return Response.json({
      question: question.trim(),
      answer: result.answer,
      sources: transactions.map((t) => ({
        merchant: t.merchant,
        transaction_date: t.transaction_date,
        amount: t.amount,
        category: t.category,
        content_text: t.content_text,
        similarity: Number(t.similarity.toFixed(3)),
      })),
      filters: {
        category: filters.category,
        start: filters.start,
        end: filters.end,
      },
    });
  } catch (error) {
    // Never echo internal failure details (provider responses, key names,
    // stack traces) to the client — log them and return a clean message.
    console.error("[/api/ask] failed:", error);
    return Response.json(
      { error: "Something went wrong while answering. Try again in a moment." },
      { status: 500 },
    );
  }
}