"use client";

import MaterialIcon from "@/components/ui/MaterialIcon";
import EmptyState from "@/components/ui/EmptyState";
import { PRIORITIES, type Company } from "@/lib/companies";
import { useT } from "@/lib/locale-context";

interface PriorityBreakdownCardProps {
  companies: Company[];
}

// "優先度別の状況" 카드. 우선순위별 전체 지원 수를 막대로, 그중 진행 중(in_progress)인
// 수를 보조 텍스트로 보여준다. 막대 스타일(라벨 폭/두께/max-w-[200px] 제한)은
// PipelineOverview.tsx·StepFunnelChart.tsx와 동일하게 재사용해 카드가 넓어져도
// 막대만 과도하게 길어지지 않도록 한다.
export default function PriorityBreakdownCard({ companies }: PriorityBreakdownCardProps) {
  const t = useT();

  const rows = PRIORITIES.map((priority) => {
    const companiesOfPriority = companies.filter((c) => c.priority === priority);
    const inProgress = companiesOfPriority.filter((c) => c.overallStatus === "in_progress").length;
    return { priority, total: companiesOfPriority.length, inProgress };
  });

  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const hasAny = rows.some((r) => r.total > 0);

  return (
    <section className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <h2 className="mb-6 flex items-center gap-2 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="star" size={17} className="text-secondary" />
        {t("analytics.byPriority.title")}
      </h2>

      {!hasAny ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="star" title={t("companies.list.empty.noCompaniesTitle")} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-6">
          {rows.map(({ priority, total, inProgress }) => (
            <div key={priority} className="flex flex-col gap-1.5">
              <div className="flex w-full items-center justify-center gap-3">
                <span className="w-14 shrink-0 text-right text-[13px] text-secondary">
                  {t(`companies.list.priority.${priority}`)}
                </span>
                <div className="h-2 w-full max-w-[200px] flex-1 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary-navy"
                    style={{ width: `${(total / maxTotal) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[14px] font-[400] text-stitch-ink">
                  {total}
                </span>
              </div>
              {inProgress > 0 && (
                <p className="text-center text-[12px] text-secondary">
                  {t("analytics.byPriority.inProgressCount", { count: inProgress })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
