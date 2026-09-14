<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ledger project conventions

- Stack is locked: Next.js 16 (App Router) + TypeScript + Tailwind v4 +
  Supabase. Do not swap in another framework, database, or vector store.
- Budget is $0: every integration must run inside its free tier.
- Secrets live only in `.env.local` / Vercel env. Never hardcode or commit
  them; `.env.local.*` is gitignored except `.env.local.example`.
- Folder layout: `app/` routes only, `components/` shared UI, `lib/` helpers
  (supabase clients, embeddings, LLM), `types/` shared types.
- The browser and server Supabase clients are separate files
  (`lib/supabase.ts` vs `lib/supabase-server.ts`) so `next/headers` stays out
  of client bundles — don't merge them.
- UI: re-read `prompts/APPENDIX-ui-direction.md` before every UI-touching
  phase. Use the color/font tokens defined in `app/globals.css` (`@theme`);
  add tokens there, don't sprinkle ad-hoc hex values.
- Before finishing any phase: `npm run lint` and `npm run build` must pass.
- Track phase status in `PROGRESS.md`.
