import { OVERALL_STATUSES, OVERALL_STATUS_LABELS, type OverallStatus, type Company } from "@/lib/companies";
import { getCurrentStep, type ApplicationStep } from "@/lib/applicationSteps";

interface PipelineOverviewProps {
  companies: Company[];
  steps: ApplicationStep[];
}

const STATUS_VALUE_CLASS: Record<OverallStatus, string> = {
  in_progress: "text-primary",
  offer: "text-offer",
  joined: "text-joined",
  rejected: "text-error",
  cancelled: "text-cancelled",
};

const NO_STEP_LABEL = "등록된 전형 없음";

export default function PipelineOverview({ companies, steps }: PipelineOverviewProps) {
  const statusCounts = OVERALL_STATUSES.map((status) => ({
    status,
    count: companies.filter((company) => company.overallStatus === status).length,
  }));

  const stepCounts = new Map<string, number>();
  for (const company of companies) {
    const companySteps = steps.filter((step) => step.companyId === company.id);
    const label = getCurrentStep(companySteps)?.name ?? NO_STEP_LABEL;
    stepCounts.set(label, (stepCounts.get(label) ?? 0) + 1);
  }
  const sortedStepCounts = Array.from(stepCounts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <section className="rounded-[10px] border border-border bg-card p-6">
      <h2 className="mb-4 text-[16px] font-semibold text-foreground">지원 현황</h2>

      <div className="mb-6">
        <div className="inline-flex flex-col items-start gap-1 rounded-[10px] border border-border bg-background px-4 py-3">
          <p className="text-xs text-secondary">전체 지원 기업 수</p>
          <p className="text-2xl font-semibold text-foreground">{companies.length}</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-3 text-xs font-medium text-secondary">기업 진행 현황</p>
        <div className="flex flex-wrap gap-3">
          {statusCounts.map(({ status, count }) => (
            <div
              key={status}
              className="flex w-24 flex-col items-center justify-center gap-1 rounded-[10px] border border-border bg-background px-2 py-3"
            >
              <span className={"text-xl font-semibold " + STATUS_VALUE_CLASS[status]}>
                {count}
              </span>
              <span className="text-center text-xs text-secondary">
                {OVERALL_STATUS_LABELS[status]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium text-secondary">단계별 기업 수</p>
        {sortedStepCounts.length === 0 ? (
          <p className="text-sm text-secondary">등록된 기업이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {sortedStepCounts.map(([label, count]) => (
              <div
                key={label}
                className="flex min-w-[96px] flex-col items-center justify-center gap-1 rounded-[10px] border border-border bg-background px-3 py-3"
              >
                <span className="text-xl font-semibold text-primary">{count}</span>
                <span className="text-center text-xs text-secondary">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
