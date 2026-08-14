"use client";

import MaterialIcon from "@/components/ui/MaterialIcon";
import type { Company } from "@/lib/companies";
import { getStepDisplayName, type ApplicationStep } from "@/lib/applicationSteps";
import { buildStepFunnelRows } from "@/lib/stepFunnel";
import { useT } from "@/lib/locale-context";
import EmptyState from "@/components/ui/EmptyState";

interface StepFunnelChartProps {
  companies: Company[];
  steps: ApplicationStep[];
}

// docs/stitch/메인페이지 5개/jobcal_analytics_standardized_design_refresh의
// "選考ステップ" 카드. 전형명별 집계(lib/stepFunnel.ts)는 그대로 두고 얇은 pill 막대
// 스타일로 재구현한다.
export default function StepFunnelChart({ companies, steps }: StepFunnelChartProps) {
  const t = useT();
  const rows = buildStepFunnelRows(companies, steps);
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <section className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <h2 className="mb-6 flex items-center gap-2 text-[13px] font-[400] text-stitch-ink">
        <MaterialIcon name="filter_list" size={15} className="text-secondary" />
        {t("analytics.funnel.title")}
      </h2>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="filter_list" title={t("analytics.funnel.empty")} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-5 overflow-y-auto stitch-scrollbar-hidden">
          {rows.map((row) => {
            const displayName = getStepDisplayName({ name: row.name, stepKey: row.stepKey }, t);
            const widthPercent = (row.count / maxCount) * 100;

            return (
              <div key={row.name} className="flex items-center gap-4">
                <span
                  className="w-20 shrink-0 truncate text-right text-[11px] text-secondary"
                  title={displayName}
                >
                  {displayName}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stitch-bg">
                  <div
                    className="h-full rounded-full bg-primary-navy transition-[width] duration-150"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[12px] font-[400] text-stitch-ink">
                  {row.count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
