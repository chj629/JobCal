"use client";

import MaterialIcon from "@/components/ui/MaterialIcon";
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
const TICK_COUNT = 5;

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

// docs/stitch/메인페이지 5개/jobcal_analytics_standardized_design_refresh의
// "応募企業の推移" 카드. companies.createdAt 기준 월별 누적 집계는 그대로 두고,
// 점선 그리드/굵은 라인/큰 점(값 라벨 없음) 스타일로 재구현한다.
export default function CompanyTrendChart({ companies }: CompanyTrendChartProps) {
  const t = useT();

  if (companies.length === 0) {
    return (
      <section className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-[500] text-stitch-ink">
          <MaterialIcon name="show_chart" size={17} className="text-secondary" />
          {t("analytics.trendChart.title")}
        </h2>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="show_chart" title={t("analytics.trendChart.empty")} />
        </div>
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
    <section className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="show_chart" size={17} className="text-secondary" />
        {t("analytics.trendChart.title")}
      </h2>

      {/* svg에 width/height를 모두 명시적으로 채워야(min-w-full처럼 최솟값만 주는 게 아니라)
          viewBox 종횡비(3:1)에 맞춰 카드 폭을 넘어서는 것을 막을 수 있다. preserveAspectRatio
          기본값(xMidYMid meet)이라 점/선이 찌그러지지 않고 필요하면 위아래 여백만 생긴다. */}
      <div className="min-h-0 flex-1">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-full w-full">
          {ticks.map((tick) => {
            const y = PADDING_TOP + CHART_HEIGHT - (tick / chartMax) * CHART_HEIGHT;
            return (
              <g key={tick}>
                <line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={WIDTH - PADDING_RIGHT}
                  y2={y}
                  stroke="var(--color-stitch-border)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
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

          <path d={pathD} fill="none" stroke="var(--color-primary-navy)" strokeWidth={4} />

          {points.map(({ x, y, row }) => (
            <g key={`${row.year}-${row.month}`}>
              <circle cx={x} cy={y} r={6} fill="var(--color-primary-navy)" />
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
