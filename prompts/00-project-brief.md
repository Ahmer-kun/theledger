# Project Brief: Ledger

Read this once. It's the shared spec every phase prompt assumes. You don't
paste this file into your AI coding tool — it's context for *you*.

## What it is

**Ledger** — a personal finance tool. Users upload receipt photos and bank
statement files (CSV/PDF). The app extracts structured transaction data
automatically, stores it, and lets the user ask plain-English questions
about their spending ("how much did I spend on food delivery last month?")
and get answers grounded in their actual transactions — with the source
records shown, not a hallucinated guess.

## Who it's for

The portfolio audience: recruiters and interviewers evaluating whether you
can (a) design a real product, (b) build a working RAG pipeline end to end,
(c) think about security/cost like an engineer, not a hobbyist.

Secondary audience: the app should also just be genuinely usable by a real
person managing their own spending.

## Non-negotiable constraints

- **Budget: $0.** Every tool chosen must have a free tier that covers full
  development and a live demo. No paid infra, no card-required trials where
  avoidable.
- **No live bank API integration** (Plaid etc. require business
  verification). Statements are uploaded manually as CSV/PDF.
- **UI must not look AI-generated.** No cream background + terracotta
  accent, no generic SaaS card grid, no ALL-CAPS eyebrow labels, no
  numbered-marker sections unless content is genuinely sequential. See
  `APPENDIX-ui-direction.md` — this is enforced every UI phase.
- **Security is real, not decorative.** Row-level security in the database,
  not just app-level checks. Secrets in env vars only.

## Tech stack (locked in — don't let the AI tool improvise a different one)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (React) | One codebase, free Vercel hosting, SSR when needed |
| Hosting | Vercel | Free tier, auto HTTPS, zero-config deploys |
| Auth | Supabase Auth | Free, handles hashing/sessions/OAuth, pairs with RLS |
| Database | Supabase Postgres | Free 500MB, includes pgvector |
| Vector search | Supabase **pgvector** | No separate vector DB needed |
| File storage | Supabase Storage | Free 1GB, for receipt images |
| Vision extraction | Gemini API (free tier) | Reads receipt images into structured data |
| Embeddings | Local `sentence-transformers` model OR Gemini embeddings free tier | Keeps the highest-volume call at $0 |
| Q&A generation | Groq (free, fast) for dev; Claude/OpenAI trial credits reserved for final demo polish | Cost control |

## Core user flow (this is what "done" looks like)

1. User signs up / logs in.
2. User uploads a receipt photo or a bank statement CSV/PDF.
3. App extracts merchant, date, amount, category (and line items if itemized).
4. Data is stored (structured row + vector embedding).
5. User opens a chat panel and asks a question about their spending.
6. App retrieves the relevant transactions via vector + filter search, and
   the LLM answers using only that retrieved data, citing which
   transactions it used.
7. A simple dashboard shows totals, spend by category, spend over time.
8. An admin (flagged via a `role` column) can view aggregate usage stats.

## Definition of "showcase-ready"

- Deployed, live URL, works on mobile browser.
- One click to sign up and try it with seed/demo data (don't require the
  visitor to have their own receipts on hand).
- README with an architecture diagram and a one-paragraph "how RAG works
  here" explanation — this is what you'll link in applications and talk
  through in interviews.
