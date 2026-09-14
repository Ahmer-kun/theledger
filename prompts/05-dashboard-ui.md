# Phase 5: Dashboard UI

## Context
Ingestion and RAG API both work and are testable via API calls. This phase
builds the actual product surface a human uses.

## Constraints
- Paste `APPENDIX-ui-direction.md` alongside this prompt — this is the
  main visual identity phase, most important one to get right.
- Must be usable on a phone browser, not just desktop.
- No paid charting library — use a free one (Recharts is fine).

## The Prompt

```
Build the main product UI for Ledger (Next.js app, upload pipeline and
/api/ask route already working).

Before writing component code, propose the design plan as instructed
below, check it against the generic-AI-tells list, revise, then build.

[paste APPENDIX-ui-direction.md contents here before running]

Screens to build:

1. Dashboard (home after login):
   - Total spend this month, with comparison to last month.
   - Spend by category (chart).
   - Spend over time (chart, last 6 months).
   - Recent transactions list (most recent 10, with merchant/date/amount/
     category, each editable inline).
   - Upload button/area prominent but not dominating the page.

2. Upload flow:
   - Wire the Phase 3 upload component into a real page.
   - Show the upload states (uploading / extracting / needs review /
     saved) with real visual treatment, not a generic spinner.
   - Needs-review state shows an editable form with the extracted fields
     pre-filled.

3. Ask panel:
   - A chat-style interface calling `/api/ask`.
   - Each answer displays the source transactions used, visually
     distinct from the answer text itself (this is the RAG "receipt" —
     lean into that idea if it fits the design plan).
   - Empty state suggests a few example questions to try (especially
     important for demo purposes, since a first-time visitor has no
     context).

4. Transactions view:
   - Full searchable/filterable list of all transactions (by date range,
     category, merchant).

5. Demo/seed mode:
   - Add a "Load demo data" action for a fresh account that seeds ~30
     realistic sample transactions, so a recruiter trying the live app
     doesn't need their own receipts on hand to see it work.

Responsive down to a 375px-wide mobile viewport. Visible keyboard focus
states throughout. Respect prefers-reduced-motion.
```

## Definition of done
- All 5 screens work on both desktop and a real mobile browser.
- Design plan was proposed, checked against the generic-tells list, and
  revised before building — keep that written plan, it's useful later.
- A fresh signup can click "load demo data" and immediately try the ask
  panel with zero setup.
