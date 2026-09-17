"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/queries";
import { formatCurrency, formatCurrencyWhole } from "@/lib/format";

// Literal token values (mirrors app/globals.css @theme) — CSS vars can be
// unreliable inside SVG presentation attributes.
const ACCENT = "#0e7c66";
const ACCENT_SOFT = "rgba(14, 124, 102, 0.35)";
const RULE = "#d8dcd8";
const MUTED = "#5a6268";

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: { value?: number | string }[];
}

function TrendTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-rule bg-surface px-3 py-2 text-sm">
      <p className="text-muted">{label}</p>
      <p className="tabular-nums text-ink">
        {formatCurrency(Number(payload[0]?.value ?? 0))}
      </p>
    </div>
  );
}

export default function SpendTrend({ data }: { data: TrendPoint[] }) {
  const hasSpending = data.some((point) => point.total > 0);
  if (!hasSpending) {
    return (
      <p className="text-sm text-muted">
        Nothing to chart yet — upload a statement and six months of spending
        will build up here.
      </p>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: RULE }}
            tick={{ fill: MUTED, fontSize: 12 }}
            interval={0}
          />
          <YAxis hide domain={[0, "auto"]} />
          <Tooltip
            cursor={{ fill: "rgba(14, 124, 102, 0.06)" }}
            content={<TrendTooltip />}
            formatter={(value) => formatCurrencyWhole(Number(value))}
          />
          <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={44}>
            {data.map((point, index) => (
              <Cell
                key={point.key}
                fill={index === data.length - 1 ? ACCENT : ACCENT_SOFT}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
