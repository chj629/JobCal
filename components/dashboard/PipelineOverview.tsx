"use client";

import { useState } from "react";
import { getCurrentStep, DEFAULT_STEP_NAMES, type ApplicationStep } from "@/lib/applicationSteps";
import type { Company } from "@/lib/companies";

interface PipelineOverviewProps {
  companies: Company[];
  steps: ApplicationStep[];
}

type PipelineFilter = "all" | "high";

const NO_STEP_LABEL = "등록된 전형 없음";
// 실제 기업에 없는(0건) 기본 전형의 정렬 위치를 정할 때만 쓰는 fallback 순서.
// application_steps.step_order는 1부터 시작하므로(마이그레이션 기준) 배열 인덱스(0부터)에 +1을 더해 맞춘다.
const DEFAULT_ORDER_INDEX = new Map(DEFAULT_STEP_NAMES.map((name, index) => [name, index + 1]));
// 01-dashboard.png 기준 막대그래프 최대 높이(px).
const CHART_MAX_HEIGHT = 160;

export default function PipelineOverview({ companies, steps }: PipelineOverviewProps) {
  const [filter, setFilter] = useState<PipelineFilter>("all");

  const filteredCompanies =
    filter === "high" ? companies.filter((company) => company.priority === "high") : companies;

  // 값이 0인 전형은 그래프에 표시하지 않으므로, 실제 기업이 있는 전형만 담는다.
  const stepCounts = new Map<string, number>();
  // 전형 추가/이름 변경/순서 변경을 반영하기 위해, 실제 데이터에 존재하는 step_order를 우선 사용한다.
  const observedOrderByLabel = new Map<string, number>();
  for (const company of filteredCompanies) {
    const companySteps = steps.filter((step) => step.companyId === company.id);
    const currentStep = getCurrentStep(companySteps);
    const label = currentStep?.name ?? NO_STEP_LABEL;
    stepCounts.set(label, (stepCounts.get(label) ?? 0) + 1);

    if (currentStep) {
      const existingOrder = observedOrderByLabel.get(label);
      if (existingOrder === undefined || currentStep.stepOrder < existingOrder) {
        observedOrderByLabel.set(label, currentStep.stepOrder);
      }
    }
  }
  const sortedStepCounts = Array.from(stepCounts.entries()).sort((a, b) => {
    const orderA =
      observedOrderByLabel.get(a[0]) ??
      DEFAULT_ORDER_INDEX.get(a[0]) ??
      DEFAULT_STEP_NAMES.length + 1;
    const orderB =
      observedOrderByLabel.get(b[0]) ??
      DEFAULT_ORDER_INDEX.get(b[0]) ??
      DEFAULT_STEP_NAMES.length + 1;
    if (orderA !== orderB) return orderA - orderB;
    return b[1] - a[1];
  });
  const maxStepCount = Math.max(1, ...sortedStepCounts.map(([, count]) => count));

  return (
    <section className="flex h-[372px] flex-col rounded-[10px] border border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-foreground">전형 단계 현황</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as PipelineFilter)}
          className="h-8 rounded-[8px] border border-border bg-card px-2 text-xs font-medium text-foreground"
        >
          <option value="all">전체 기업</option>
          <option value="high">집중 관리 기업(우선순위 높음)</option>
        </select>
      </div>

      {filteredCompanies.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-secondary">
          등록된 기업이 없습니다.
        </p>
      ) : (
        <div className="flex flex-1 flex-col justify-end">
          <div className="flex items-end gap-3" style={{ minHeight: CHART_MAX_HEIGHT + 28 }}>
            {sortedStepCounts.map(([label, count]) => (
              <div key={label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[13px] font-semibold text-foreground">{count}</span>
                <div
                  className="w-full max-w-[28px] rounded-t-[4px] bg-primary"
                  style={{ height: `${Math.max(4, (count / maxStepCount) * CHART_MAX_HEIGHT)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="border-t border-border" />
          <div className="mt-2 flex gap-3">
            {sortedStepCounts.map(([label]) => (
              <span
                key={label}
                className="min-h-[28px] flex-1 text-center text-[11px] leading-tight text-secondary"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
