import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";
import CategoryBars from "@/components/category-bars";
import SpendTrend from "@/components/charts/spend-trend";
import TransactionTable from "@/components/transaction-table";
import DemoDataButton from "@/components/demo-data-button";

const PRIMARY =
  "rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-ink";

function comparisonText(
  thisMonth: number,
  lastMonth: number,
  lastMonthLabel: string,
): string {
  if (lastMonth === 0) {
    return `No spending recorded in ${lastMonthLabel} to compare with.`;
  }
  const delta = thisMonth - lastMonth;
  if (Math.abs(delta) < 0.005) return `Exactly the same as ${lastMonthLabel}.`;
  return delta > 0
    ? `${formatCurrency(delta)} more than ${lastMonthLabel}.`
    : `${formatCurrency(Math.abs(delta))} less than ${lastMonthLabel}.`;
}

function EmptyDashboard() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
      <h1 className="font-serif text-4xl text-ink">Nothing here yet</h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
        Ledger turns your receipts and statements into answers about your
        spending. Add your first file, or load a demo account to look around
        first.
      </p>
      <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Link href="/upload" className={PRIMARY}>
          Add a receipt or statement
        </Link>
        <DemoDataButton />
      </div>
      <p className="mt-4 max-w-md text-sm text-muted">
        Demo data adds 30 transactions across the last six months and embeds
        them, so the Ask page works right away. It only loads into an empty
        account.
      </p>
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await getDashboardData(supabase);
  if (data.totalCount === 0) return <EmptyDashboard />;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <h1 className="font-serif text-3xl text-ink">Overview</h1>
      <p className="mt-1 text-sm text-muted">
        Every figure comes from the transactions you have uploaded.
      </p>

      <article className="mt-8 overflow-hidden rounded-lg border border-rule bg-surface">
        <section className="px-5 py-7 sm:px-8 sm:py-9">
          <p className="text-sm text-muted">Spent in {data.monthLabel}</p>
          <p className="mt-1 font-serif text-4xl tabular-nums text-ink sm:text-5xl">
            {formatCurrency(data.thisMonthTotal)}
          </p>
          <p className="mt-2 text-sm text-muted">
            {comparisonText(
              data.thisMonthTotal,
              data.lastMonthTotal,
              data.lastMonthLabel,
            )}
          </p>
        </section>

        <div className="grid border-t border-rule lg:grid-cols-2">
          <section className="px-5 py-7 sm:px-8 sm:py-8">
            <h2 className="text-sm font-medium text-ink">
              This month by category
            </h2>
            <div className="mt-5">
              <CategoryBars
                data={data.byCategory}
                total={data.thisMonthTotal}
              />
            </div>
          </section>
          <section className="border-t border-rule px-5 py-7 sm:px-8 sm:py-8 lg:border-l lg:border-t-0">
            <h2 className="text-sm font-medium text-ink">Last six months</h2>
            <div className="mt-5">
              <SpendTrend data={data.trend} />
            </div>
          </section>
        </div>

        <section className="border-t border-rule px-5 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-ink">
              Recent transactions
            </h2>
            <Link
              href="/transactions"
              className="rounded text-sm text-muted transition-colors hover:text-ink"
            >
              All transactions
            </Link>
          </div>
          <div className="mt-3">
            <TransactionTable rows={data.recent} editable />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-paper/60 px-5 py-4 sm:px-8">
          <p className="text-sm text-muted">
            Have another receipt or statement to add?
          </p>
          <Link
            href="/upload"
            className="rounded text-sm font-medium text-accent-ink transition-colors hover:text-ink"
          >
            Add receipts
          </Link>
        </div>
      </article>
    </div>
  );
}
