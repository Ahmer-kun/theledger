# Phase 6: Admin Panel

## Context
Core product works end to end for a regular user. This phase adds a
gated admin view — small in scope, but a good interview talking point
about roles/authorization.

## Constraints
- Admin access is enforced server-side (route + query level), never just
  hidden in the UI.
- Admin sees aggregate/usage data, not other users' raw transaction
  contents, unless you've deliberately decided otherwise and can justify
  it — default to aggregate-only.

## The Prompt

```
Add an admin panel to Ledger, gated by the `role` column on `profiles`
from Phase 2.

1. Route protection:
   - `/admin` route checks the signed-in user's role server-side (not
     just client-side) before rendering anything or returning any data.
     Non-admins get redirected, not shown a broken page.

2. What the admin panel shows:
   - Total signed-up users, and signups over time.
   - Total receipts/statements processed, and a breakdown by
     source_type.
   - Extraction success rate (how many needed manual review vs. were
     auto-saved) — this is a genuinely useful product metric, use it.
   - No individual user's raw transaction contents — aggregate-only
     queries.

3. Manually promote a test user to admin (via SQL, not a UI toggle — we
   don't want a self-service path to becoming admin) and confirm the
   panel works and that a regular user hitting `/admin` is blocked.

Keep this small — it's a demonstration of role-based access control done
correctly, not a full internal tool.
```

## Definition of done
- A regular user cannot reach `/admin` data even via direct API call.
- Admin panel shows real aggregate numbers from your test/demo data.
- You can explain in one or two sentences why it's aggregate-only.
