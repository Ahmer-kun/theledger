import type { CategoryTotal } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

export default function CategoryBars({
  data,
  total,
}: {
  data: CategoryTotal[];
  total: number;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted">
        No spending recorded this month yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3.5">
      {data.map(({ category, total: categoryTotal }) => {
        const pct = total > 0 ? (categoryTotal / total) * 100 : 0;
        return (
          <li key={category}>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="min-w-0 truncate text-ink">{category}</span>
              <span className="tabular-nums text-muted">
                {formatCurrency(categoryTotal)}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 w-full rounded-full bg-rule/60"
              role="img"
              aria-label={`${category}: ${formatCurrency(categoryTotal)}, ${Math.round(pct)}% of the month`}
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
  );
}
