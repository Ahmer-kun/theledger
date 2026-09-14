# Phase 4: RAG Pipeline

## Context
Transactions are being ingested and saved. This is the core showcase
phase: embeddings, vector search, and grounded question answering.

## Constraints
- Embeddings must be free (local model or free-tier API) — this is the
  highest-volume call in the app.
- The answer-generation LLM must only answer from retrieved data, and
  must say so explicitly when it can't find a relevant match — never
  fabricate a number.
- Show which transactions were used to produce the answer — this is the
  entire point of RAG over plain chat.

## The Prompt

```
Build the RAG pipeline for Ledger (ingestion pipeline from the previous
phase already saves transactions to Supabase Postgres with pgvector
available).

1. Embeddings:
   - Implement `lib/embeddings.ts` for real now: generate an embedding
     for each receipt's content_text using [a local sentence-transformers
     model via a small Python microservice / OR the Gemini embeddings
     free tier — pick whichever is simpler to wire up in this stack and
     say which you chose and why].
   - On every successful ingestion, generate and store the embedding in
     `transaction_embeddings` alongside the content_text.
   - Add a backfill script for any existing rows without embeddings.

2. Retrieval:
   - Implement a `lib/retrieval.ts` function: given a user's natural
     language question, embed the question, then query pgvector for the
     top-k most similar transactions scoped to that user (RLS still
     applies), combined with any obvious structured filters extractable
     from the question (date ranges, category keywords) so retrieval
     isn't purely semantic when the question implies a filter.

3. Grounded generation:
   - Implement `lib/answer.ts`: send the retrieved transactions plus the
     user's question to the Q&A LLM (Groq free tier for dev), with a
     system prompt that instructs it to answer ONLY from the provided
     transactions, cite specific transactions in its answer (merchant +
     date + amount), and explicitly say "I don't have enough transaction
     data to answer that" if retrieval returned nothing relevant — never
     estimate or guess a number that isn't in the retrieved set.

4. API route:
   - Build a `/api/ask` route that takes a question, runs retrieval, runs
     generation, and returns both the answer text and the list of source
     transactions used (so the UI can display them).

5. Write a short test set of 10 realistic questions (spending totals,
   category breakdowns, specific merchant lookups, month comparisons,
   "find this specific purchase") and manually verify each one either
   answers correctly with citations or correctly says it can't find the
   data. Save this test set as `/docs/rag-eval-questions.md` — this
   becomes evidence you built an eval process, not just a demo.

Do not build the chat UI yet — that's the next phase. Focus on the
API route working correctly and being testable via curl/Postman first.
```

## Definition of done
- All 10 eval questions produce correct, cited, or correctly-declined
  answers — verified manually and recorded.
- `/api/ask` returns both the answer and the source transaction list.
- No fabricated numbers appear in any test — this is the thing to be
  strictest about.
