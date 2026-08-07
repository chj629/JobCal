"use client";

import { TrendingUp } from "lucide-react";
import type { Company } from "@/lib/companies";
import { useT } from "@/lib/locale-context";
import EmptyState from "@/components/ui/EmptyState";

interface CompanyTrendChartProps {
  companies: Company[];
}

const MONTH_COUNT = 12;
const WIDTH = 720;
const HEIGHT = 240;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 16;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 32;
const CHART_WIDTH = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const CHART_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const TICK_COUNT = 4;

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

// 11_analytics.png "응모수의 추이" 카드. companies.createdAt(=DB의 created_at) 기준으로
// 최근 12개월의 월별 신규 기업 수와 누적 기업 수를 계산한다. 새 차트 라이브러리 없이
// SVG로 직접 그린다(StatusDonutChart.tsx와 같은 방식).
export default function CompanyTrendChart({ companies }: CompanyTrendChartProps) {
  const t = useT();

  if (companies.length === 0) {
    return (
      <section className="rounded-[10px] border border-border bg-card p-6">
        <h2 className="text-[16px] font-semibold text-foreground">
          {t("analytics.trendChart.title")}
        </h2>
        <EmptyState icon={TrendingUp} title={t("analytics.trendChart.empty")} />
      </section>
    );
  }

  const now = new Date();
  const months = Array.from({ length: MONTH_COUNT }, (_, i) => {
    const offset = MONTH_COUNT - 1 - i;
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const newCountByKey = new Map<string, number>();
  for (const company of companies) {
    const created = new Date(company.createdAt);
    const key = monthKey(created.getFullYear(), created.getMonth());
    newCountByKey.set(key, (newCountByKey.get(key) ?? 0) + 1);
  }

  let cumulative = 0;
  const rows = months.map(({ year, month }) => {
    const newCount = newCountByKey.get(monthKey(year, month)) ?? 0;
    cumulative += newCount;
    return { year, month, newCount, cumulative };
  });

  const maxCumulative = Math.max(1, rows[rows.length - 1].cumulative);
  const step = Math.max(1, Math.ceil(maxCumulative / TICK_COUNT));
  const chartMax = step * TICK_COUNT;

  const points = rows.map((row, i) => {
    const x = PADDING_LEFT + (CHART_WIDTH * i) / (rows.length - 1 || 1);
    const y = PADDING_TOP + CHART_HEIGHT - (row.cumulative / chartMax) * CHART_HEIGHT;
    return { x, y, row };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => step * i);

  return (
    <section className="rounded-[10px] border border-border bg-card p-6">
      <h2 className="text-[16px] font-semibold text-foreground">
        {t("analytics.trendChart.title")}
      </h2>

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="min-w-[600px]">
          {ticks.map((tick) => {
            const y = PADDING_TOP + CHART_HEIGHT - (tick / chartMax) * CHART_HEIGHT;
            return (
              <g key={tick}>
                <line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={WIDTH - PADDING_RIGHT}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />
                <text
                  x={PADDING_LEFT - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--color-secondary)"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth={2} />

          {points.map(({ x, y, row }) => (
            <g key={`${row.year}-${row.month}`}>
              <circle cx={x} cy={y} r={3} fill="var(--color-primary)" />
              <text
                x={x}
                y={y - 10}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-foreground)"
              >
                {row.cumulative}
              </text>
              <text
                x={x}
                y={HEIGHT - PADDING_BOTTOM + 18}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-secondary)"
              >
                {row.month + 1}
                {t("analytics.trendChart.monthUnit")}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
