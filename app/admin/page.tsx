import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getAdminStats, type SourceCount } from "@/lib/admin";
import SignupsChart from "@/components/admin/signups-chart";

const SOURCE_LABELS: Record<string, string> = {
  receipt: "Receipts",
  statement_line: "Statement lines",
};

function sourceTotal(source: SourceCount, key: string): number {
  return source.source_type === key ? source.count : 0;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const stats = await getAdminStats(supabase);
  if (!stats) redirect("/");

  const receiptsBySource = stats.receipts.by_source;
  const sourceRows = ["receipt", "statement_line"].map((key) => {
    const count = receiptsBySource.reduce(
      (sum, row) => sum + sourceTotal(row, key),
      0,
    );
    return { key, count };
  });

  const processed = stats.receipts.saved + stats.receipts.needs_review;
  const autoSavedRate = processed > 0 ? stats.receipts.saved / processed : null;
  const autoSavedPct = autoSavedRate
    ? Math.round(autoSavedRate * 100)
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <h1 className="font-serif text-3xl text-ink">Admin</h1>
      <p className="mt-1 text-sm text-muted">
        Aggregate usage across every Ledger account — never individual
        transaction contents.
      </p>

      <article className="mt-8 overflow-hidden rounded-lg border border-rule bg-surface">
        <section className="px-5 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-ink">Signed up users</h2>
            <span className="text-sm text-muted">All accounts</span>
          </div>
          <p className="mt-3 font-serif text-4xl tabular-nums text-ink sm:text-5xl">
            {stats.users.total.toLocaleString("en-US")}
          </p>
          <div className="mt-7">
            <SignupsChart days={stats.users.signups} />
          </div>
        </section>

        <section className="border-t border-rule px-5 py-7 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-ink">
              Transactions processed
            </h2>
            <span className="text-sm text-muted">
              Receipts and statement lines
            </span>
          </div>
          <p className="mt-3 font-serif text-4xl tabular-nums text-ink sm:text-5xl">
            {stats.receipts.total.toLocaleString("en-US")}
          </p>

          <div className="mt-6 grid gap-8 border-t border-rule pt-6 lg:grid-cols-2 lg:gap-12">
            <div>
              <h3 className="text-sm font-medium text-ink">By source</h3>
              {stats.receipts.total > 0 ? (
                <ul className="mt-4 space-y-3.5">
                  {sourceRows.map(({ key, count }) => {
                    const pct =
                      stats.receipts.total > 0
                        ? (count / stats.receipts.total) * 100
                        : 0;
                    return (
                      <li key={key}>
                        <div className="flex items-baseline justify-between gap-4 text-sm">
                          <span className="text-ink">{SOURCE_LABELS[key]}</span>
                          <span className="tabular-nums text-muted">
                            {count.toLocaleString("en-US")}
                          </span>
                        </div>
                        <div
                          className="mt-1.5 h-1.5 w-full rounded-full bg-rule/60"
                          role="img"
                          aria-label={`${SOURCE_LABELS[key]}: ${count}, ${Math.round(pct)}% of processed`}
                        >
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  No uploads recorded yet.
                </p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-ink">
                Extraction quality
              </h3>
              <p className="mt-1 text-sm text-muted">
                Share of processed rows saved without manual review.
              </p>
              {autoSavedPct !== null ? (
                <>
                  <p className="mt-4 font-serif text-3xl tabular-nums text-ink">
                    {autoSavedPct}% auto-saved
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-baseline justify-between gap-4">
                      <span className="text-ink">Auto-saved</span>
                      <span className="tabular-nums text-muted">
                        {stats.receipts.saved.toLocaleString("en-US")}
                      </span>
                    </li>
                    <li className="flex items-baseline justify-between gap-4">
                      <span className="text-ink">Needs review</span>
                      <span className="tabular-nums text-muted">
                        {stats.receipts.needs_review.toLocaleString("en-US")}
                      </span>
                    </li>
                  </ul>
                  <div
                    className="mt-4 h-1.5 w-full rounded-full bg-rule/60"
                    role="img"
                    aria-label={`${autoSavedPct}% of processed rows were auto-saved`}
                  >
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(autoSavedRate! * 100, 2)}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  No extractions recorded yet.
                </p>
              )}
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}