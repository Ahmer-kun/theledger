# Phase 8: Polish & Deploy

## Context
Final phase. Ship it and make it presentable.

## Constraints
- Paste `APPENDIX-ui-direction.md` again for the polish pass — details
  like empty/error states are easy to leave generic.

## The Prompt

```
Final polish and deploy pass for Ledger.

1. Empty and error states: review every screen for a first-time-visitor
   state and an error state. Rewrite any generic "Oops, something went
   wrong!" text into the product's voice: say what happened and what to
   do next, plainly.

2. Loading states: confirm nothing shows an indefinite spinner with no
   explanation — every async action has a specific, honest status label.

3. Accessibility pass: keyboard-only navigation through the whole app,
   visible focus states, alt text on any meaningful images, color
   contrast check on the palette chosen in Phase 5.

4. Deploy:
   - Connect the repo to Vercel, set all environment variables in the
     Vercel dashboard (never in code).
   - Confirm the deployed build works end to end: signup, demo data
     load, upload, ask panel, admin panel (with a promoted test admin).
   - Confirm HTTPS is enforced (Vercel default).

5. README finalization:
   - Fill in the architecture diagram placeholder from Phase 1 (a simple
     ASCII or Mermaid diagram of: upload → extraction → storage →
     embedding → retrieval → generation → UI is enough).
   - Write a one-paragraph "How RAG works in this project" explanation
     in plain language — this is what gets linked in applications.
   - Add the live demo URL and a "load demo data" instruction at the
     top.

6. Final smoke test: sign up as a brand new user with no prior data,
   load demo data, ask 5 questions from the eval set in
   /docs/rag-eval-questions.md, confirm each one still works correctly
   against the deployed build.
```

## Definition of done
- Live URL works for a stranger with zero setup.
- README is genuinely link-in-applications ready.
- All 5 smoke-test questions pass against the deployed (not local) build.
