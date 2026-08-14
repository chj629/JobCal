"use client";

import MaterialIcon from "@/components/ui/MaterialIcon";
import { OVERALL_STATUSES, type Company, type OverallStatus } from "@/lib/companies";
import { useT } from "@/lib/locale-context";

interface StatusDonutChartProps {
  companies: Company[];
}

const RADIUS = 40;
const STROKE_WIDTH = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// code.html은 세그먼트 사이에 흰색 오버레이 스트로크(0.5/100)로 틈을 낸다. 같은 시각
// 결과를 각 세그먼트 길이를 그만큼 줄이는 방식으로 재현한다(동적 데이터에도 그대로 적용).
const GAP_LENGTH = (0.6 / 100) * CIRCUMFERENCE;

// StatusBadge.tsx와 동일한 라벨 키를 재사용하되, screen.png의 문구가 기존 전역 상태
// 라벨(不採用/応募辞退)과 달라(不合格/応募取消) 이 차트 전용 키를 따로 둔다.
const STATUS_LABEL_KEYS: Record<OverallStatus, string> = {
  in_progress: "companies.list.status.inProgress",
  offer: "companies.list.status.offer",
  joined: "companies.list.status.joined",
  rejected: "analytics.statusChart.labels.rejected",
  cancelled: "analytics.statusChart.labels.cancelled",
};

// screen.png 실측 색상(code.html의 hex와 동일하게 확인됨).
const STATUS_COLOR: Record<OverallStatus, string> = {
  in_progress: "#1e3a8a",
  offer: "#93c5fd",
  joined: "#10b981",
  rejected: "#fca5a5",
  cancelled: "#e2e8f0",
};

const STATUS_DOT_CLASS: Record<OverallStatus, string> = {
  in_progress: "bg-[#1e3a8a]",
  offer: "bg-[#93c5fd]",
  joined: "bg-[#10b981]",
  rejected: "bg-[#fca5a5]",
  cancelled: "bg-[#e2e8f0]",
};

// docs/stitch/메인페이지 5개/jobcal_analytics_standardized_design_refresh의
// "ステータス別企業数" 카드. 새 차트 라이브러리 없이 SVG stroke-dasharray로 도넛을
// 직접 그리는 기존 방식은 유지하고, 시각(색/간격/카드 비율)만 screen.png에 맞춘다.
export default function StatusDonutChart({ companies }: StatusDonutChartProps) {
  const t = useT();

  const total = companies.length;
  const counts = OVERALL_STATUSES.map((status) => ({
    status,
    count: companies.filter((c) => c.overallStatus === status).length,
  }));
  const visibleCount = counts.filter(({ count }) => count > 0).length;

  let cumulative = 0;
  const segments = counts
    .filter(({ count }) => count > 0)
    .map(({ status, count }) => {
      const rawLength = (count / total) * CIRCUMFERENCE;
      const length = Math.max(0, rawLength - (visibleCount > 1 ? GAP_LENGTH : 0));
      const dashoffset = -cumulative;
      cumulative += rawLength;
      return { status, length, dashoffset };
    });

  return (
    <section className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <h2 className="mb-6 flex items-center gap-2 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="donut_large" size={17} className="text-secondary" />
        {t("analytics.statusChart.title")}
      </h2>

      <div className="flex flex-1 items-center justify-between gap-8 px-4">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="var(--color-stitch-border)"
              strokeWidth={STROKE_WIDTH}
            />
            {total > 0 &&
              segments.map(({ status, length, dashoffset }) => (
                <circle
                  key={status}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={STATUS_COLOR[status]}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                  strokeDashoffset={dashoffset}
                />
              ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-[400] leading-none tracking-tight text-stitch-ink">
              {total}
            </span>
            <span className="mt-1 text-[11px] font-[400] text-secondary">
              {t("analytics.statusChart.total")}
            </span>
          </div>
        </div>

        <ul className="flex w-24 flex-col gap-3.5">
          {counts.map(({ status, count }) => (
            <li key={status} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={"h-3 w-3 shrink-0 rounded-full " + STATUS_DOT_CLASS[status]} />
                <span className="text-[13px] text-stitch-ink">{t(STATUS_LABEL_KEYS[status])}</span>
              </div>
              <span className="text-[13px] font-[400] text-stitch-ink">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
