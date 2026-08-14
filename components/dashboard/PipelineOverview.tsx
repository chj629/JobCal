"use client";

import { useState } from "react";
import {
  getCurrentStep,
  getStepDisplayName,
  DEFAULT_STEP_KEYS,
  type ApplicationStep,
} from "@/lib/applicationSteps";
import type { Company } from "@/lib/companies";
import { useT } from "@/lib/locale-context";
import EmptyState from "@/components/ui/EmptyState";
import MaterialIcon from "@/components/ui/MaterialIcon";
import ScrollFade from "@/components/ui/ScrollFade";
import { useScrollFade } from "@/lib/useScrollFade";

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

export default function PipelineOverview({ companies, steps }: PipelineOverviewProps) {
  const t = useT();
  const [filter, setFilter] = useState<PipelineFilter>("all");

  // "選考中 KPI"(overallStatus === in_progress)와 같은 모집단을 기준으로 삼는다.
  // offer/joined/rejected/cancelled로 이미 결과가 난 기업은 application_steps가 갱신되지
  // 않은 채로 남아있을 수 있어(자동 동기화 없음), 파이프라인 집계에서 제외한다.
  const filteredCompanies = companies.filter(
    (company) =>
      company.overallStatus === "in_progress" && (filter === "all" || company.priority === "high")
  );

  // 값이 0인 전형은 표시하지 않으므로, 실제 기업이 있는 전형만 담는다.
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
  const { scrollRef, canScrollDown, onScroll } = useScrollFade([sortedStepCounts.length]);

  return (
    <div className="flex h-[320px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
          <MaterialIcon name="monitoring" size={17} className="text-secondary" />
          {t("dashboard.pipeline.title")}
        </h3>
        <div className="flex items-center gap-4">
          {(["all", "high"] as PipelineFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={
                "pb-0.5 text-[12px] transition-colors " +
                (filter === key
                  ? "border-b-[1.5px] border-foreground font-[400] text-stitch-ink"
                  : "text-secondary hover:text-stitch-ink")
              }
            >
              {key === "all" ? t("dashboard.pipeline.filterAll") : t("dashboard.pipeline.filterHigh")}
            </button>
          ))}
        </div>
      </div>

      {sortedStepCounts.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="apartment" title={t("dashboard.pipeline.empty")} />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex h-full flex-col justify-start space-y-4 overflow-y-auto overflow-x-hidden stitch-scrollbar-hidden"
        >
          {sortedStepCounts.map(([key, count], index) => {
            const opacity = 0.4 + (index / Math.max(1, sortedStepCounts.length - 1)) * 0.6;

            return (
              <div key={key} className="flex w-full items-center gap-3">
                <span className="w-24 shrink-0 truncate text-left text-[13px] text-secondary">
                  {groupDisplayName.get(key)}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary-navy"
                    style={{ width: `${(count / maxStepCount) * 100}%`, opacity }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[14px] font-[400] text-stitch-ink">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
        <ScrollFade visible={canScrollDown} />
        </div>
      )}
    </div>
  );
}
