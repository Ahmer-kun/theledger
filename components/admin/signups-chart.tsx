import type { SignupDay } from "@/lib/admin";

function dayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function SignupsChart({ days }: { days: SignupDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const recent = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-ink">Signups in the last 30 days</span>
        <span className="tabular-nums text-muted">{recent}</span>
      </div>
      <div
        className="mt-3 flex h-16 items-end gap-px"
        role="img"
        aria-label={`Signups per day over the last 30 days, ${recent} total`}
      >
        {days.map((d) => (
          <div
            key={d.day}
            className="h-full flex-1"
            title={`${d.day}: ${d.count}`}
          >
            <div
              className="w-full rounded-sm bg-accent/40"
              style={{ height: `${(d.count / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span>{days.length > 0 ? dayLabel(days[0].day) : ""}</span>
        <span>
          {days.length > 0 ? dayLabel(days[days.length - 1].day) : ""}
        </span>
      </div>
    </div>
  );
}