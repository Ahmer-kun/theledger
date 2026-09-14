# Phase 1: Setup & Architecture

## Context
Nothing exists yet. This phase creates the repo skeleton and locks in the
stack so later phases don't drift.

## Constraints
- Use exactly the stack from `00-project-brief.md` — don't let the tool
  suggest swapping in Firebase, MongoDB, Pinecone, etc.
- No paid services enabled at this stage.
- Also paste `APPENDIX-ui-direction.md` alongside this prompt — this phase
  scaffolds the base layout/shell, so it counts as a UI-touching phase.

## The Prompt

```
I'm building "Ledger," a personal finance web app: users upload receipt
photos and bank statement CSV/PDF files, the app extracts structured
transaction data, and users can ask natural-language questions about their
spending answered via RAG (retrieval-augmented generation) grounded in
their real transactions.

Set up the project scaffold with this exact stack:
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase client for auth, Postgres, pgvector, and file storage
- No other database or vector store

Do the following:
1. Initialize a Next.js project with TypeScript and Tailwind.
2. Create a clean folder structure: /app routes, /components, /lib
   (supabase client, embeddings helper, LLM API helpers), /types.
3. Add a `.env.local.example` file listing every environment variable
   we'll need across the whole project (Supabase URL/keys, Gemini API key,
   Groq API key) with placeholder values and one-line comments explaining
   each — do not put real keys anywhere.
4. Add `.env.local` to `.gitignore`.
5. Set up the Supabase client in /lib/supabase.ts (browser + server
   variants).
6. Build a minimal app shell: a top nav with the product name, a
   sign-in/sign-up placeholder link, and an empty home page — following
   the design plan process described below before writing any component
   styling.
7. Write a root README.md with setup instructions (clone, install, add
   env vars, run dev server) — leave a placeholder section for the
   architecture diagram we'll fill in during the final phase.

[paste APPENDIX-ui-direction.md contents here before running]

Stop after the scaffold runs locally with `npm run dev` and shows the
empty shell. Don't build auth or any feature logic yet — that's the next
phase.
```

## Definition of done
- `npm run dev` runs with no errors.
- Folder structure exists and is committed to a new git repo.
- `.env.local.example` lists all variables, `.env.local` is gitignored.
- App shell renders with the intentional design plan applied, not default
  Tailwind styling.
