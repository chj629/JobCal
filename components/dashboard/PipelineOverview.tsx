import type { CompanyStatus } from "@/components/StatusBadge";
import type { Company } from "@/lib/companies";

interface PipelineOverviewProps {
  companies: Company[];
}

// Dashboard 전용 요약 그룹. lib/companies.ts의 STEP_TYPES 자체는 그대로 두고
// 여기서만 표시 목적으로 묶어서 집계한다.
const MAIN_STAGES: { label: string; steps: string[] }[] = [
  { label: "지원", steps: ["엔트리", "설명회"] },
  { label: "서류 / 테스트", steps: ["ES", "Web 테스트", "코딩 테스트"] },
  { label: "면접", steps: ["1차 면접", "2차 면접", "최종 면접"] },
  { label: "내정", steps: ["내정"] },
];

const RESULT_STAGES: { label: string; status: CompanyStatus; valueClassName: string }[] = [
  { label: "입사", status: "입사", valueClassName: "text-joined" },
  { label: "불합격", status: "불합격", valueClassName: "text-error" },
  { label: "전형 취소", status: "지원 취소", valueClassName: "text-cancelled" },
];

export default function PipelineOverview({ companies }: PipelineOverviewProps) {
  const mainCounts = MAIN_STAGES.map((stage) => ({
    label: stage.label,
    count: companies.filter((company) => stage.steps.includes(company.currentStep)).length,
  }));

  const resultCounts = RESULT_STAGES.map((stage) => ({
    label: stage.label,
    count: companies.filter((company) => company.status === stage.status).length,
    valueClassName: stage.valueClassName,
  }));

  return (
    <section className="rounded-[10px] border border-border bg-card p-6">
      <h2 className="mb-4 text-[16px] font-semibold text-foreground">지원 파이프라인</h2>

      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {mainCounts.map((stage, index) => (
          <div key={stage.label} className="flex shrink-0 items-center gap-2">
            <div
              className={
                "flex w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-[10px] border px-2 py-4 " +
                (stage.count > 0
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background")
              }
            >
              <span
                className={
                  "text-2xl font-semibold " + (stage.count > 0 ? "text-primary" : "text-secondary")
                }
              >
                {stage.count}
              </span>
              <span className="text-center text-xs text-secondary">{stage.label}</span>
            </div>
            {index < mainCounts.length - 1 && <span className="shrink-0 text-secondary">→</span>}
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-3 text-xs font-medium text-secondary">최종 결과</p>
        <div className="flex flex-wrap gap-3">
          {resultCounts.map((stage) => (
            <div
              key={stage.label}
              className="flex w-24 flex-col items-center justify-center gap-1 rounded-[10px] border border-border bg-background px-2 py-3"
            >
              <span className={"text-xl font-semibold " + stage.valueClassName}>{stage.count}</span>
              <span className="text-center text-xs text-secondary">{stage.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
