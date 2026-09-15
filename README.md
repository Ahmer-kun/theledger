# Ledger — Receipt & Statement Intelligence

A personal finance tool. Users upload receipt photos and bank statement files
(CSV/PDF), the app extracts structured transaction data, and users can ask
plain-English questions about their spending — with answers grounded in their
real transactions, source records shown, not a hallucinated guess.

Built as a portfolio piece demonstrating a working RAG pipeline end to end.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Hosting | Vercel (free tier) |
| Auth | Supabase Auth |
| Database | Supabase Postgres (`.` free tier, pgvector included) |
| Vector search | Supabase pgvector |
| File storage | Supabase Storage |
| Vision extraction | Gemini API (free tier) |
| Embeddings | Local `sentence-transformers` model or Gemini embeddings free tier |
| Q&A generation | Groq (free tier) |

## Setup

Requirements: Node 20+, npm, and free accounts for Supabase, Vercel, Google
Studio (Gemini), and Groq.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.local.example .env.local
#   ...then fill in your Supabase URL, anon key, Gemini key, and Groq key.
#   The service role key is used by server-side code in later phases only.

# 3. Start the dev server
npm run dev
```

Open http://localhost:3000. Secrets stay in `.env.local` only — never in code,
never committed.

## Project structure

```
app/          # Routes only (App Router)
components/   # Shared UI components
lib/          # supabase clients, embeddings helper, LLM helpers
types/        # Shared TypeScript types
prompts/      # Phase-by-phase build kit (see README in that folder)
```

The browser and server Supabase clients are intentionally separate files
(`lib/supabase.ts` vs `lib/supabase-server.ts`) so server-only modules like
`next/headers` never end up in client bundles.

## Built in phases

This repo follows a phase-wise build kit in `prompts/`. Each phase file is a
self-contained prompt for an AI coding tool, run in order:

| # | File | What it builds |
|---|------|-----------------|
| 0 | 00-project-brief.md | Shared context (read-only) |
| 1 | 01-setup-and-architecture.md | Repo scaffold, stack decisions, folder structure |
| 2 | 02-auth-and-database.md | Supabase auth, schema, row-level security |
| 3 | 03-ingestion-pipeline.md | Receipt/statement upload + extraction (vision LLM) |
| 4 | 04-rag-pipeline.md | Embeddings, vector search, grounded Q&A |
| 5 | 05-dashboard-ui.md | Core app UI — upload, chat, spending views |
| 6 | 06-admin-panel.md | Admin route, usage stats, role gating |
| 7 | 07-security-hardening.md | Rate limiting, validation, secrets, RLS audit |
| 8 | 08-polish-and-deploy.md | Empty/error states, responsive pass, deploy to Vercel |

Current status: see `PROGRESS.md`.

## Database setup

Apply the migrations in `supabase/migrations/` to your Supabase project (SQL
Editor, or `supabase db push` with the Supabase CLI). They create the
`profiles`, `receipts`, and `transaction_embeddings` tables, enable the
pgvector extension, and install row-level security (model explained in
`SECURITY.md`).

Auth providers:
- Email/password needs no extra setup.
- Google OAuth: in Supabase Dashboard > Authentication > Providers, enable
  Google and paste the Client ID + Secret from a Google Cloud OAuth app.

## How RAG works here

> Architecture diagram placeholder — final phase fills this in.

<!-- The last phase will replace this placeholder with an architecture diagram
     (Mermaid or image) and a one-paragraph "how RAG works here" explanation. -->