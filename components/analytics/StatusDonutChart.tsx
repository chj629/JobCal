"use client";

import { OVERALL_STATUSES, type Company, type OverallStatus } from "@/lib/companies";
import { useT } from "@/lib/locale-context";

interface StatusDonutChartProps {
  companies: Company[];
}

const RADIUS = 70;
const STROKE_WIDTH = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE_WIDTH) * 2;

// StatusBadge.tsx와 동일한 라벨 키를 재사용한다.
const STATUS_LABEL_KEYS: Record<OverallStatus, string> = {
  in_progress: "companies.list.status.inProgress",
  offer: "companies.list.status.offer",
  joined: "companies.list.status.joined",
  rejected: "companies.list.status.rejected",
  cancelled: "companies.list.status.cancelled",
};

// StatusBadge는 in_progress/offer가 둘 다 primary(파란색)라 단독 배지일 때는 문제없지만,
// 도넛에서는 5개 상태를 동시에 표시해야 해서 두 상태가 구분되지 않는다. 새 색을 만들지 않고
// 기존 디자인 토큰 중 아직 상태에 쓰이지 않은 success(초록)를 offer에 배정해 구분한다.
const STATUS_COLOR_VAR: Record<OverallStatus, string> = {
  in_progress: "var(--color-primary)",
  offer: "var(--color-success)",
  joined: "var(--color-joined)",
  rejected: "var(--color-error)",
  cancelled: "var(--color-cancelled)",
};

const STATUS_DOT_CLASS: Record<OverallStatus, string> = {
  in_progress: "bg-primary",
  offer: "bg-success",
  joined: "bg-joined",
  rejected: "bg-error",
  cancelled: "bg-cancelled",
};

// 11_analytics.png "상태별 기업 수" 카드. 새 차트 라이브러리 없이 SVG stroke-dasharray로
// 도넛을 직접 그린다(PipelineOverview.tsx가 막대그래프를 라이브러리 없이 구현한 것과 같은 방식).
export default function StatusDonutChart({ companies }: StatusDonutChartProps) {
  const t = useT();

  const total = companies.length;
  const counts = OVERALL_STATUSES.map((status) => ({
    status,
    count: companies.filter((c) => c.overallStatus === status).length,
  }));

  let cumulative = 0;

  return (
    <section className="rounded-[10px] border border-border bg-card p-6">
      <h2 className="text-[16px] font-semibold text-foreground">
        {t("analytics.statusChart.title")}
      </h2>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={STROKE_WIDTH}
            />
            {total > 0 &&
              counts
                .filter(({ count }) => count > 0)
                .map(({ status, count }) => {
                  const length = (count / total) * CIRCUMFERENCE;
                  const dashoffset = -cumulative;
                  cumulative += length;

                  return (
                    <circle
                      key={status}
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      stroke={STATUS_COLOR_VAR[status]}
                      strokeWidth={STROKE_WIDTH}
                      strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                      strokeDashoffset={dashoffset}
                    />
                  );
                })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-bold text-foreground">{total}</span>
            <span className="text-xs text-secondary">
              {t("analytics.statusChart.total")}
              {t("analytics.statusChart.unit")}
            </span>
          </div>
        </div>

        <ul className="flex w-full flex-col gap-2">
          {counts.map(({ status, count }) => {
            const percent = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;

            return (
              <li key={status} className="flex items-center gap-2 text-sm">
                <span
                  className={"h-2.5 w-2.5 shrink-0 rounded-full " + STATUS_DOT_CLASS[status]}
                />
                <span className="flex-1 text-foreground">{t(STATUS_LABEL_KEYS[status])}</span>
                <span className="text-secondary">
                  {count}
                  {t("analytics.statusChart.unit")} ({percent}%)
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
