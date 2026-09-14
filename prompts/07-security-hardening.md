# Phase 7: Security Hardening

## Context
Everything functionally works. This phase is a dedicated pass to make the
security story true, not just described in SECURITY.md.

## The Prompt

```
Do a security hardening pass on Ledger (Next.js + Supabase app, all core
features built).

1. Re-audit RLS: for every table, write and run a test that confirms a
   user cannot read, write, or delete another user's rows — even via
   crafted requests, not just through the normal UI flow.

2. Rate limiting: add basic rate limiting on /api/ask and the upload
   endpoint (use Vercel's built-in options or a simple in-memory/Upstash
   free-tier limiter) so the free-tier LLM APIs can't be abused into a
   cost or quota problem.

3. File upload validation: confirm file type is checked by content, not
   just extension; confirm size limits are enforced server-side, not
   only in the browser.

4. Secrets audit: grep the whole repo for anything that looks like a key,
   token, or password to confirm nothing is hardcoded; confirm
   `.env.local` is genuinely gitignored and was never committed.

5. Input handling: confirm all user-supplied text (category overrides,
   search queries, chat questions) is properly parameterized/escaped
   before hitting the database — no raw string concatenation into
   queries.

6. Error handling: confirm no endpoint leaks stack traces, internal
   error messages, or database details to the client — return a clean,
   generic error to the user and log details server-side.

Update SECURITY.md with what was tested and confirmed, so it's an
accurate document, not just an intention.
```

## Definition of done
- Every item above has been actually tested, not just implemented.
- SECURITY.md accurately reflects what was verified.
- You could walk an interviewer through this file and answer follow-up
  questions about it.
