"use client";

import { useState, type FormEvent } from "react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { getCurrentStep, getStepDisplayName } from "@/lib/applicationSteps";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface StepTimelineProps {
  companyId: string;
  selectedStepId: string | null;
  onSelect: (id: string | null) => void;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "Progress Stepper
// (Compact)" 카드. 전형 목록/현재 전형 계산(addStep 포함)은 기존 로직 그대로 재사용하고,
// 가로 타임라인 UI만 Stitch의 원형 스텝퍼로 바꿨다. 원을 클릭하면 선택되어 아래
// "選考詳細" 카드(SelectionDetail.tsx)에 그 전형의 상세가 표시된다.
export default function StepTimeline({ companyId, selectedStepId, onSelect }: StepTimelineProps) {
  const t = useT();
  const { steps, addStep } = useApplicationSteps();
  const [isAdding, setIsAdding] = useState(false);
  const [newStepName, setNewStepName] = useState("");

  const companySteps = steps
    .filter((step) => step.companyId === companyId)
    .sort((a, b) => a.stepOrder - b.stepOrder);
  const currentStep = getCurrentStep(companySteps);

  async function handleAddStep(event: FormEvent) {
    event.preventDefault();
    if (!newStepName.trim()) {
      setIsAdding(false);
      return;
    }
    const created = await addStep(companyId, newStepName);
    setNewStepName("");
    setIsAdding(false);
    if (created) onSelect(created.id);
  }

  // 단계 이름 길이와 무관하게 원형 번호 중심 간격이 항상 균등하도록, flex 대신
  // 슬롯 폭이 모두 같은 grid로 배치한다(각 단계 + "追加" 슬롯 = companySteps.length + 1열).
  const slotCount = companySteps.length + 1;

  return (
    <div className="mb-8 rounded-stitch-xl border border-stitch-border bg-card p-4 shadow-sm">
      {/* 375/430px처럼 슬롯 수(전형 수+1)가 많아 minmax(0,1fr)만으로는 원이 서로
          맞닿고 라벨이 대부분 잘리는 문제가 있어, 슬롯 최소폭(64px)을 두고 이 래퍼에
          가로 스크롤을 허용한다. 데스크톱처럼 카드 폭이 충분하면 1fr이 여전히 남는
          공간을 균등 분배해 기존과 동일하게 꽉 채워진 균등 간격으로 보인다(스크롤 불필요). */}
      <div className="overflow-x-auto stitch-scrollbar-hidden">
        <div
          className="relative grid w-full items-start"
          style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(64px, 1fr))` }}
        >
          <div className="absolute left-0 top-3 -z-10 flex w-full items-center px-4">
            <div className="h-[2px] flex-1 bg-stitch-border" />
          </div>

            {companySteps.map((step) => {
            const isCompleted = step.stepStatus === "completed";
            const isCurrent = currentStep?.id === step.id;
            const isSelected = selectedStepId ? step.id === selectedStepId : isCurrent;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onSelect(step.id)}
                aria-pressed={isSelected}
                className="flex min-w-0 flex-col items-center gap-1.5 bg-card px-1"
              >
                <span
                  className={
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-[400] shadow-sm " +
                    (isCompleted
                      ? "bg-success text-white"
                      : isCurrent
                        ? "bg-primary-navy text-white ring-2 ring-primary-navy/20"
                        : "border border-stitch-border bg-card text-secondary") +
                    (isSelected && !isCompleted && !isCurrent ? " ring-2 ring-primary-navy/40" : "")
                  }
                >
                  {isCompleted ? (
                    <MaterialIcon name="check" size={14} filled />
                  ) : (
                    step.stepOrder
                  )}
                </span>
                <span
                  className={
                    "w-full truncate text-center text-[10px] font-[400] " +
                    (isSelected || isCurrent ? "text-stitch-ink" : "text-secondary")
                  }
                >
                  {getStepDisplayName(step, t)}
                </span>
              </button>
            );
          })}

          <div className="flex min-w-0 flex-col items-center gap-1.5 bg-card px-1">
            {isAdding ? (
              <form onSubmit={handleAddStep} className="w-full">
                <input
                  type="text"
                  autoFocus
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  onBlur={handleAddStep}
                  placeholder={t("companies.steps.newStepPlaceholder")}
                  className="w-full min-w-0 rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[11px] text-stitch-ink outline-none"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-stitch-border bg-card text-secondary transition-colors hover:border-primary-navy hover:text-primary-navy"
              >
                <MaterialIcon name="add" size={14} />
              </button>
            )}
            <span className="w-full truncate text-center text-[10px] font-[400] text-secondary">
              {t("companies.steps.addStep")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
