"use client";

import { Filter } from "lucide-react";
import type { Company } from "@/lib/companies";
import { getCurrentStep, type ApplicationStep } from "@/lib/applicationSteps";
import { useT } from "@/lib/locale-context";
import EmptyState from "@/components/ui/EmptyState";

interface StepFunnelChartProps {
  companies: Company[];
  steps: ApplicationStep[];
}

interface FunnelRow {
  name: string;
  count: number;
}

// 11_analytics.png "선고 스텝별 통과 상황" 카드. 전형명은 기업마다 자유 입력이라
// 동일한 문자열끼리만 집계하고, 뜻이 비슷해 보여도 다른 이름끼리 임의로 묶지 않는다.
export default function StepFunnelChart({ companies, steps }: StepFunnelChartProps) {
  const t = useT();

  const stepsByCompany = new Map<string, ApplicationStep[]>();
  for (const step of steps) {
    const list = stepsByCompany.get(step.companyId) ?? [];
    list.push(step);
    stepsByCompany.set(step.companyId, list);
  }

  // 등장하는 전형명을 관측된 최소 step_order 기준으로 정렬한다(기업마다 순서가 다를 수 있어
  // 가장 앞서 관측된 순서를 그 이름의 대표 순서로 삼는다).
  const orderByName = new Map<string, number>();
  for (const step of steps) {
    const existing = orderByName.get(step.name);
    if (existing === undefined || step.stepOrder < existing) {
      orderByName.set(step.name, step.stepOrder);
    }
  }

  const stepNames = Array.from(orderByName.keys()).sort(
    (a, b) => (orderByName.get(a) ?? 0) - (orderByName.get(b) ?? 0)
  );

  // 각 전형명에 대해 "그 전형을 완료했거나, 현재 전형이 그 전형과 같거나 더 뒤(step_order가
  // 크거나 같음)인 기업" 수를 센다. docs/database.md의 현재 전형 계산 규칙(getCurrentStep)을
  // 그대로 재사용한다.
  const rows: FunnelRow[] = stepNames.map((name) => {
    let count = 0;
    for (const company of companies) {
      const companySteps = stepsByCompany.get(company.id) ?? [];
      const targetStep = companySteps.find((s) => s.name === name);
      if (!targetStep) continue;

      if (targetStep.stepStatus === "completed") {
        count += 1;
        continue;
      }

      const currentStep = getCurrentStep(companySteps);
      if (currentStep && targetStep.stepOrder <= currentStep.stepOrder) {
        count += 1;
      }
    }
    return { name, count };
  });

  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <section className="rounded-[10px] border border-border bg-card p-6">
      <h2 className="text-[16px] font-semibold text-foreground">{t("analytics.funnel.title")}</h2>

      {rows.length === 0 ? (
        <EmptyState icon={Filter} title={t("analytics.funnel.empty")} />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rows.map((row, index) => {
            const widthPercent = (row.count / maxCount) * 100;
            const prevCount = index === 0 ? row.count : rows[index - 1].count;
            const passRate =
              index === 0 ? 100 : prevCount > 0 ? Math.round((row.count / prevCount) * 1000) / 10 : 0;

            return (
              <div key={row.name} className="flex items-center gap-3">
                <span
                  className="w-28 shrink-0 truncate text-sm text-foreground"
                  title={row.name}
                >
                  {row.name}
                </span>
                <div className="h-8 flex-1 overflow-hidden rounded-md bg-background">
                  <div
                    className="h-full rounded-md bg-primary transition-[width] duration-150"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right text-sm text-secondary">
                  {row.count}
                  {t("analytics.funnel.unit")} · {passRate}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
