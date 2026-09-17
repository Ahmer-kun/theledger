# Phase 5 — Dashboard UI: Design Plan

Written **before** component code, per the UI-direction appendix. This is the
plan of record for phases 5, 6 and 8.

## Palette (existing `@theme` tokens — extended, not replaced)

| Token | Hex | Role |
|---|---|---|
| `--color-paper` | `#f4f6f4` | Page background — a cool, paper-white green-grey |
| `--color-surface` | `#ffffff` | Raised surface (forms, inputs, chart plot area) |
| `--color-ink` | `#191b1c` | Primary text and numerals |
| `--color-muted` | `#5a6268` | Secondary text, labels, axis ticks |
| `--color-rule` | `#d8dcd8` | Hairline rules, borders, table separators |
| `--color-accent` | `#0e7c66` | The one accent: primary actions **and** flagged needs-review state |
| `--color-accent-ink` | `#09594a` | Accent hover/pressed |
| `--color-danger` | `#a8322e` | Genuine errors only |

Only two additions planned, if needed at build time: `--color-accent-wash`
(a ~6% accent tint for the flagged row background) — otherwise no new colors.

## Typefaces & roles

- **Fraunces (600)** — display only: the page title, the hero month total, and
  the wordmark. Gives the product an editorial, record-book voice.
- **Inter** — everything functional: body, labels, table cells, buttons, chart
  ticks, and all numerals with `tabular-nums` so columns align.

No monospace anywhere (nothing here is code-like).

## Layout concept

**The ledger sheet.** One disciplined column of hairline-ruled rows on paper —
no card grid, no drop shadows, no gradients. Figures sit right-aligned in
tabular figures against a rule, the way a ledger is read. The month total is
the single hero numeral in Fraunces; the comparison to last month is a plain
sentence beneath it, never a colored up/down arrow. Charts are quiet
instruments drawn directly on the paper: a horizontal bar per category, and a
thin 6-month bar series — flat accent fills, no gridlines, no gradient. The
"ask" answers read as entries; each answer's sources are presented as a small
**receipt stub** — a tinted, left-ruled block listing the exact transactions
used, visibly separate from the prose. Upload is a quiet dashed strip and a
button, present on the dashboard but not competing with the numbers.

## The one memorable decision

**The citation "receipt stub."** Every grounded answer carries a physical
record of what it was built from: a tinted block, ruled, headed `Sources`,
listing merchant / date / amount per row. It's the RAG proof made visual — the
product's trust mechanism, not decoration. Everything else stays quiet around
it.

## Generic-AI-tells check (from the appendix)

| # | Tell | Verdict / revision |
|---|---|---|
| 1 | Cream `#F4F1EA` + terracotta `#D97757` | Avoided — palette is a cool paper-grey with a deep green accent. |
| 2 | Near-black + acid/vermilion accent | Avoided. |
| 3 | Identical rounded card + grey shadow + gradients everywhere | **Revised:** no shadows or gradients; hierarchy from hairlines, rules and tabular alignment. Radii capped at 8px, used sparingly. |
| 4 | Tracked ALL-CAPS eyebrows on every heading | Avoided — sentence-case section labels only, with a rule. |
| 5 | Middle-dot metas / "WORD — fragment" labels | **Revised:** structured columns and plain labels (`Merchant`, `Date`, `Amount`); no middle dots, no spaced em dashes. |
| 6 | Monospace for small data labels | Avoided — `tabular-nums` Inter (functional alignment, not styling). |
| 7 | "→" appended to every link | Avoided entirely. |
| 8 | Numbered 01/02/03 markers | Avoided. |
| 9 | Fade-slide-up on every section / hover on every card | **Revised:** no entrance animation; only two micro-transitions (link color, button background). `prefers-reduced-motion` already honored globally. |

## Grounding in "finance product"

Legible numerals (tabular Inter, right-aligned), calm and trustworthy, one
accent used sparingly — primary action and the needs-review flag. Body copy
measure held under ~80 characters. No playful neon, no enterprise grey.

## Screens & routes

- `/` — Dashboard: month total + comparison, category bars, 6-month trend,
  recent 10 transactions (inline editable), quiet upload strip.
- `/upload` — the Phase 3 flow on a real page, with an explicit step rule
  (Choosing → Uploading → Reading → Review → Saved), not a spinner.
- `/ask` — chat-style panel over `/api/ask`; every answer carries its source
  receipt stub; empty state offers three example questions.
- `/transactions` — full list with date-range, category and merchant filters.
- Demo mode — a "Load demo data" action on the dashboard empty state that
  seeds ~30 realistic transactions (embedded for RAG) so a fresh signup can
  immediately use `/ask`.

## Notes / assumptions

- Money in = `amount > 0`; statement debits are negative (Phase 3 behaviour).
  The dashboard reports **spend as the sum of absolute amounts** — Ledger does
  not yet model income, so every ingested row is treated as an outflow.
- Charts use Recharts (free), client-side only, with an explicit empty state.
- No gain/loss color semantics: increases/decreases are stated in words, not
  red/green, to keep the accent meaningful.
