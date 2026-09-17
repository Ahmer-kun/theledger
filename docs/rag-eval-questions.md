# RAG Evaluation — Questions & Results

Phase 4 evidence set: 10 realistic questions exercised end-to-end against a
known seed dataset. The goal is not just "an answer" — every run is checked
for **correct, cited answers** and for the **complete absence of fabricated
numbers**. Any question the data can't answer must be declined verbatim.

## Dataset (throwaway eval user, seeded 2026-09-17)

22 transactions across July–August 2026:

| Date | Merchant | Amount | Category | Items |
|---|---|---|---|---|
| 2026-07-02 | TRADER JOE'S | 58.30 | Groceries | — |
| 2026-07-04 | NETFLIX | 15.49 | Subscriptions | — |
| 2026-07-08 | SAFEWAY | 33.75 | Groceries | — |
| 2026-07-09 | DOORDASH + CHIPOTLE | 28.90 | Food & Dining | — |
| 2026-07-11 | COMCAST INTERNET | 70.00 | Bills & Utilities | — |
| 2026-07-13 | TARGET | 65.32 | Shopping | — |
| 2026-07-18 | UBER TRIP | 12.75 | Transport | — |
| 2026-07-25 | CLOUD STORAGE | 2.99 | Subscriptions | — |
| 2026-07-27 | LYFT | 31.05 | Transport | — |
| 2026-07-30 | LOCAL DINER | 24.35 | Food & Dining | — |
| 2026-08-01 | METRO TRANSIT | 20.00 | Transport | — |
| 2026-08-02 | TRADER JOE'S | 62.40 | Groceries | — |
| 2026-08-05 | BLUE BOTTLE COFFEE | 7.75 | Food & Dining | — |
| 2026-08-06 | NETFLIX | 15.49 | Subscriptions | — |
| 2026-08-09 | UBER TRIP | 19.26 | Transport | — |
| 2026-08-12 | SWEETGREEN | 16.40 | Food & Dining | — |
| 2026-08-14 | SPOTIFY | 11.99 | Subscriptions | — |
| 2026-08-15 | SAFEWAY | 47.12 | Groceries | — |
| 2026-08-18 | AMAZON | 129.99 | Shopping | Wireless Headphones (129.99) |
| 2026-08-20 | SHELL GAS | 45.42 | Transport | — |
| 2026-08-24 | SUNRUN SOLAR | 71.20 | Bills & Utilities | — |
| 2026-08-25 | DMV RENEWAL | 92.00 | Other | — |

Monthly totals for the comparison question:
- **July 2026: 342.90**
- **August 2026: 539.02**
- **Difference (Aug − Jul): 196.12**

## Method

- Each question is submitted via `retrieval` (embed, filter, pgvector top-k)
  then `answer` (Groq generation) — the exact path `/api/ask` runs.
- Retrieval prints the filters applied + the sources returned with
  similarity, so a wrong answer can be traced to a wrong filter or a wrong
  source, not to the LLM.
- "Decline" is also a pass when the data genuinely has no answer — and the
  Verdict column records the decline was used, never a guess.

## Questions & results

Run: 2026-09-17  TF=Epoch  (greenfield seed each run; model `openai/gpt-oss-120b`).

| # | Question | Expected | Retrieval filters | Top sources (sim) | Answers (verbatim, trimmed) | Verdict |
|---|---|---|---|---|---|---|
| 1 | How much did I spend on groceries in August? | 109.52 | category=Groceries, 2026-08-01→31 | Safeway 08/15 $47.12 (.757); Trader Joe's 08/02 $62.40 (.751) | You spent a total of **$109.52** on groceries in August (SAFEWAY, 08/15/26, $47.12 + TRADER JOE'S, 08/02/26, $62.40). | PASS |
| 2 | What was my total Uber spend over the last 3 months? | 32.01 | none (semantic); 2026-06-18→09-17 | Uber 08/09 $19.26 (.773); Uber 07/18 $12.75 (.750) | Your Uber spending in the past three months totals **$32.01** (… $19.26 on 08/09/26 + $12.75 on 07/18/26). | PASS |
| 3 | Which subscriptions did I pay for in August? | Netflix 15.49, Spotify 11.99 (27.48) | category=Subscriptions, 2026-08-01→31 | Netflix 08/06 $15.49 (.778); Spotify 08/14 $11.99 (.774) | You paid for Netflix (08/06/26, $15.49) and Spotify (08/14/26, $11.99). | PASS |
| 4 | How much did I spend at Trader Joe's last month? | 62.40 | none (semantic); last month 2026-08-01→31 | Trader Joe's 08/02 $62.40 (.768) | You spent $62.40 at Trader Joe's (TRADER JOE'S, 08/02/26, $62.40). | PASS |
| 5 | When did I buy the headphones? | 2026-08-18 (Amazon, Wireless Headphones) | none (semantic via line-item text) | Amazon 08/18 $129.99 (.746) — **note: with the pre-fix code, the "phone" substring in "headphones" wrongly fired Bills & Utilities and retrieval failed; fixed with word-boundary keywords** | You bought the headphones on August 18 2026 (AMAZON, 08/18/26, $129.99). | PASS |
| 6 | How much did I spend on food and dining in July? | 53.25 | category=Food & Dining, 2026-07-01→31 | Local Diner 07/30 $24.35 (.778); DoorDash+Chipotle 07/09 $28.90 (.766) | You spent a total of **$53.25** on Food & Dining in July (LOCAL DINER, 07/30/26, $24.35 + DOORDASH + CHIPOTLE, 07/09/26, $28.90). | PASS |
| 7 | How much more did I spend in August than in July? | +196.12 (539.02 vs 342.90) | comparison → filters suppressed, pure semantic | 22 rows | You spent **$196.12 more in August than in July**. Full breakdown: August $539.02, July $342.90, difference $196.12 (all 22 rows cited). | PASS |
| 8 | What is my biggest single purchase? | 129.99 (Amazon, Aug 18) | none (pure semantic) | Amazon 08/18 $129.99 (.698) | Your biggest single purchase was $129.99 at AMAZON on 08/18/26. | PASS |
| 9 | How much did I spend on gas last month? | 45.42 (Shell, Aug 20) | none (semantic; gas is not a category); last month 2026-08-01→31 | Shell 08/20 $45.42 (.761) | You spent $45.42 on gas last month (SHELL GAS, 08/20/26, $45.42). | PASS |
| 10 | How much did I spend on flights to Japan in August? | must decline | none (semantic); Aug date | Uber/Shell/Netflix/… Aug rows | I don't have enough transaction data to answer that. (LLM declined; top sim ~0.70 — no Japan/flight matches) | PASS |

## DoD checks

- [x] All 10 questions answered correctly **or** correctly declined — 10/10 PASS, plus the RLS check (user B sees 0 receipts and 0 RPC results).
- [x] Every numeric answer cites merchant + date + amount from the dataset.
- [x] Zero fabricated numbers (verified by diffing every stated number
      against the seed table above). Q10 (no data) was declined verbatim rather
      than guessed.
- Embeddings: `gemini-embedding-2` requested at `outputDimensionality: 768`
  (the older `text-embedding-004` is 404 on this API key).
- Generation: Groq `openai/gpt-oss-120b` (default `GROQ_MODEL`);
  `llama-3.3-70b-versatile` has been retired on Groq.
- Environment note: Google egress from the dev machine opens in bursts, so
  the harness batch-embeds all questions up front and waits out blackouts.