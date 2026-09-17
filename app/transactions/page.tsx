import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getFilteredReceipts } from "@/lib/queries";
import { CATEGORIES, type Category } from "@/types";
import { formatCurrency } from "@/lib/format";
import TransactionTable from "@/components/transaction-table";

const FIELD =
  "mt-0.5 w-full rounded-md border border-rule bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-muted";

interface SearchParams {
  q?: string;
  category?: string;
  from?: string;
  to?: string;
}

const isDate = (value: string | undefined): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category =
    params.category && CATEGORIES.includes(params.category as Category)
      ? (params.category as Category)
      : null;
  const from = isDate(params.from) ? params.from : null;
  const to = isDate(params.to) ? params.to : null;

  const rows = await getFilteredReceipts(supabase, { q, category, from, to });
  const total = rows.reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const filtered = Boolean(q || category || from || to);

  return (
    <section className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <h1 className="font-serif text-3xl text-ink">Transactions</h1>
      <p className="mt-1 text-sm text-muted">
        Edit a row to correct it — the change is re-embedded, so Ask sees the
        correction too. Deleting a row removes it everywhere.
      </p>

      <form
        method="get"
        className="mt-6 grid gap-3 border-y border-rule bg-surface px-4 py-5 sm:grid-cols-[1fr_12rem_9rem_9rem_auto] sm:items-end sm:px-5"
      >
        <label className="block">
          <span className="text-xs text-muted">Merchant contains</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="e.g. trader"
            className={FIELD}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Category</span>
          <select name="category" defaultValue={category ?? ""} className={FIELD}>
            <option value="">All</option>
            {CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-muted">From</span>
          <input type="date" name="from" defaultValue={from ?? ""} className={FIELD} />
        </label>
        <label className="block">
          <span className="text-xs text-muted">To</span>
          <input type="date" name="to" defaultValue={to ?? ""} className={FIELD} />
        </label>
        <div className="flex items-center gap-3 pb-0.5">
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-ink"
          >
            Apply
          </button>
          {filtered ? (
            <Link
              href="/transactions"
              className="rounded text-sm text-muted transition-colors hover:text-ink"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <p className="mt-5 text-sm text-muted">
        {rows.length} transaction{rows.length === 1 ? "" : "s"}
        {rows.length > 0 ? `, ${formatCurrency(total)} total` : ""}
      </p>

      <div className="mt-2">
        <TransactionTable
          rows={rows}
          editable
          deletable
          emptyMessage={
            filtered
              ? "No transactions match these filters."
              : "Nothing here yet — add a receipt or statement to get started."
          }
        />
      </div>
    </section>
  );
}
