"use client";

import MaterialIcon from "@/components/ui/MaterialIcon";
import EmptyState from "@/components/ui/EmptyState";
import { PRIORITIES, type Company } from "@/lib/companies";
import { useT } from "@/lib/locale-context";

interface PriorityBreakdownCardProps {
  companies: Company[];
}

// "優先度別の状況" 카드. 우선순위별 전체 지원 수를 막대로, 그중 진행 중(in_progress)인
// 수를 보조 텍스트로 보여준다. 라벨-막대-숫자 배치는 StepFunnelChart.tsx와 동일한 구조
// (라벨 고정 폭 + 막대 flex-1 + 숫자 고정 폭)라 카드가 넓어지면 막대가 그만큼 길어진다.
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
              <div className="flex w-full items-center gap-4">
                <span className="w-14 shrink-0 text-left text-[13px] text-secondary">
                  {t(`companies.list.priority.${priority}`)}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
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
                <div className="flex w-full items-center gap-4">
                  <span className="w-14 shrink-0" aria-hidden="true" />
                  <p className="flex-1 text-[12px] text-secondary">
                    {t("analytics.byPriority.inProgressCount", { count: inProgress })}
                  </p>
                  <span className="w-6 shrink-0" aria-hidden="true" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
