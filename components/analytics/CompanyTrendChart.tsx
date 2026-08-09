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

      {/* md(768px) 이상에서는 기존 그대로: 카드 폭이 항상 600px보다 넉넉해 min-w-[600px]가
          스크롤 없이 안전하고, 2단이 열리는 1600px 이상에서는 506px보다 여유 있는 480px로
          낮춘다(자세한 폭 계산은 app/(app)/analytics/page.tsx 주석 참고).
          md 미만(모바일 375~430px)은 카드 콘텐츠 폭이 약 263~318px로 600px 바닥값을 절대
          만족할 수 없어 항상 가로 스크롤이 강제됐다. svg는 min-width 외에 별도 width를
          지정하지 않아 block 요소 기본값(width:auto)으로 이미 부모(카드) 폭을 그대로
          채우던 중이었으므로, 모바일에서만 그 바닥값을 없애 자연스럽게 카드 폭 100%에
          맞춰지도록 한다(viewBox="0 0 720 240"과 좌표 계산은 그대로 유지). */}
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="min-w-full md:min-w-[600px] min-[1600px]:min-w-[480px]"
        >
          {/* 모바일에서 SVG가 카드 폭(≈263~318px)까지 줄어들면 축척이 약 0.37~0.44배가 되어,
              기존 fontSize=11/strokeWidth=2/r=3이 물리적으로 4~5px 수준까지 작아진다. CSS는
              presentation attribute보다 우선하므로 max-md: 클래스로만 덮어써 좌표/viewBox는
              그대로 두고 시각 크기만 키운다. 값 텍스트(y - 10 위치, 좌표 계산 변경 금지)가
              같은 점의 원과 겹치지 않아야 하므로 "0.25 × fontSize ≤ 10 - r" 여유를 두고
              text-[18px] · r:5px · stroke-width:4px로 정했다(문자/점 간 가로 간격도 충분함). */}
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
                  className="max-md:text-[18px]"
                  fill="var(--color-secondary)"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <path
            d={pathD}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={2}
            className="max-md:[stroke-width:4px]"
          />

          {points.map(({ x, y, row }) => (
            <g key={`${row.year}-${row.month}`}>
              <circle
                cx={x}
                cy={y}
                r={3}
                fill="var(--color-primary)"
                className="max-md:[r:5px]"
              />
              <text
                x={x}
                y={y - 10}
                textAnchor="middle"
                fontSize={11}
                className="max-md:text-[18px]"
                fill="var(--color-foreground)"
              >
                {row.cumulative}
              </text>
              <text
                x={x}
                y={HEIGHT - PADDING_BOTTOM + 18}
                textAnchor="middle"
                fontSize={11}
                className="max-md:text-[18px]"
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
