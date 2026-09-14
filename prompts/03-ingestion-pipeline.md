# Phase 3: Ingestion Pipeline

## Context
Auth + schema exist. This phase builds the actual upload → extraction →
storage pipeline for receipts and bank statements.

## Constraints
- Vision extraction uses the Gemini free tier — don't default to a paid
  vision API.
- Validate file type/size before any processing (security requirement,
  not optional).
- Handle extraction failure gracefully — never silently drop a file or
  silently guess data as if it were confirmed.

## The Prompt

```
Build the ingestion pipeline for Ledger (Next.js + Supabase app, auth and
schema already in place).

1. File upload:
   - An upload component accepting either an image (receipt) or a
     CSV/PDF (bank statement), from file picker or drag-and-drop.
   - Validate file type and size client- and server-side before
     processing (reject anything else with a clear message).
   - Store the raw file in Supabase Storage under a path scoped to the
     user's id.

2. Receipt image extraction:
   - Send the uploaded receipt image to the Gemini API (vision) with a
     prompt that extracts: merchant, transaction_date, amount, category
     (pick from a fixed category list), and line_items if itemized.
   - Require the model to return strict JSON matching a defined schema —
     validate the response before saving; if it doesn't validate, show
     the user an editable form pre-filled with whatever was extracted
     instead of silently failing.

3. Bank statement parsing:
   - CSV: parse rows into transactions directly (no LLM needed — this is
     structured data already).
   - PDF: extract text, then use the same Gemini extraction step to turn
     it into structured transaction rows.
   - Map each parsed row into the `receipts` table with
     source_type = 'statement_line'.

4. Category classification:
   - Use a fixed category list (Food & Dining, Groceries, Transport,
     Subscriptions, Shopping, Bills & Utilities, Entertainment, Other).
   - Let the extraction step assign a category, but let the user
     override it in the UI — and note this in the UI copy so it's clear
     it's editable, not fixed.

5. After a successful save, hand off to the embeddings step (build a
   `lib/embeddings.ts` function stub now — I'll wire the actual model in
   the next phase — that takes a receipt row and returns a content_text
   string suitable for embedding, e.g. "Spent $42.50 at Trader Joe's on
   groceries, March 3rd").

6. Show clear upload states: uploading, extracting, needs review (low
   confidence extraction), saved. No spinner-with-no-explanation.

Do not build the chat/RAG query interface yet — that's the next phase.
```

## Definition of done
- Uploading a real receipt photo produces a correctly structured, saved
  transaction (verify with 3+ real receipts of different formats).
- Uploading a CSV statement produces multiple correctly parsed rows.
- A deliberately bad/blurry file produces a reviewable draft, not a crash
  or a confidently wrong silent save.
