"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import {
  getCurrentStep,
  getStepDisplayName,
  DEFAULT_STEP_KEYS,
  type ApplicationStep,
} from "@/lib/applicationSteps";
import type { Company } from "@/lib/companies";
import { useT } from "@/lib/locale-context";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";

interface PipelineOverviewProps {
  companies: Company[];
  steps: ApplicationStep[];
}

type PipelineFilter = "all" | "high";

// 실제 기업에 없는(0건) 기본 전형의 정렬 위치를 정할 때만 쓰는 fallback 순서.
// application_steps.step_order는 1부터 시작하므로(마이그레이션 기준) 배열 인덱스(0부터)에 +1을 더해 맞춘다.
// step_key 기준이라 locale과 무관하게 항상 동일한 순서를 준다.
const DEFAULT_ORDER_INDEX = new Map<string, number>(
  DEFAULT_STEP_KEYS.map((key, index) => [key, index + 1])
);
// "현재 전형 없음" 그룹을 위한 내부 키. 실제 step_key/이름과 겹치지 않는 값이면 되고,
// 화면에는 절대 노출되지 않는다(표시는 항상 t("dashboard.noStepLabel")를 따로 사용).
const NO_STEP_GROUP_KEY = "__no_step__";
// 01-dashboard.png 기준 막대그래프 최대 높이(px).
const CHART_MAX_HEIGHT = 160;

export default function PipelineOverview({ companies, steps }: PipelineOverviewProps) {
  const t = useT();
  const [filter, setFilter] = useState<PipelineFilter>("all");

  const filteredCompanies =
    filter === "high" ? companies.filter((company) => company.priority === "high") : companies;

  // 값이 0인 전형은 그래프에 표시하지 않으므로, 실제 기업이 있는 전형만 담는다.
  // 그룹핑 키는 기본 전형이면 step_key(언어 무관), 사용자 커스텀 전형이면 이름을 그대로
  // 쓴다(이름 기반 그룹핑 자체는 기존과 동일하게 유지). 표시용 라벨은 groupDisplayName에
  // 별도로 두고 locale에 맞게 번역한다.
  const stepCounts = new Map<string, number>();
  const groupDisplayName = new Map<string, string>();
  // 전형 추가/이름 변경/순서 변경을 반영하기 위해, 실제 데이터에 존재하는 step_order를 우선 사용한다.
  const observedOrderByKey = new Map<string, number>();
  for (const company of filteredCompanies) {
    const companySteps = steps.filter((step) => step.companyId === company.id);
    const currentStep = getCurrentStep(companySteps);
    const groupKey = currentStep ? (currentStep.stepKey ?? currentStep.name) : NO_STEP_GROUP_KEY;
    const displayName = currentStep ? getStepDisplayName(currentStep, t) : t("dashboard.noStepLabel");

    stepCounts.set(groupKey, (stepCounts.get(groupKey) ?? 0) + 1);
    if (!groupDisplayName.has(groupKey)) {
      groupDisplayName.set(groupKey, displayName);
    }

    if (currentStep) {
      const existingOrder = observedOrderByKey.get(groupKey);
      if (existingOrder === undefined || currentStep.stepOrder < existingOrder) {
        observedOrderByKey.set(groupKey, currentStep.stepOrder);
      }
    }
  }
  const sortedStepCounts = Array.from(stepCounts.entries()).sort((a, b) => {
    const orderA =
      observedOrderByKey.get(a[0]) ?? DEFAULT_ORDER_INDEX.get(a[0]) ?? DEFAULT_STEP_KEYS.length + 1;
    const orderB =
      observedOrderByKey.get(b[0]) ?? DEFAULT_ORDER_INDEX.get(b[0]) ?? DEFAULT_STEP_KEYS.length + 1;
    if (orderA !== orderB) return orderA - orderB;
    return b[1] - a[1];
  });
  const maxStepCount = Math.max(1, ...sortedStepCounts.map(([, count]) => count));

  return (
    <section className="flex h-[372px] flex-col rounded-[10px] border border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-foreground">{t("dashboard.pipeline.title")}</h2>
        <Select
          size="sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as PipelineFilter)}
        >
          <option value="all">{t("dashboard.pipeline.filterAll")}</option>
          <option value="high">{t("dashboard.pipeline.filterHigh")}</option>
        </Select>
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon={Building2} title={t("dashboard.pipeline.empty")} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-end">
          <div className="flex items-end gap-3" style={{ minHeight: CHART_MAX_HEIGHT + 28 }}>
            {sortedStepCounts.map(([key, count]) => (
              <div key={key} className="flex flex-1 flex-col items-center justify-end gap-1.5">
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
            {sortedStepCounts.map(([key]) => (
              <span
                key={key}
                className="min-h-[28px] flex-1 text-center text-[11px] leading-tight text-secondary"
              >
                {groupDisplayName.get(key)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
