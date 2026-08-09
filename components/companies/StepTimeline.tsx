"use client";

import { useState, type FormEvent } from "react";
import { Check, ListChecks } from "lucide-react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { getCurrentStep, getStepDisplayName } from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import { useLocale, useT } from "@/lib/locale-context";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface StepTimelineProps {
  companyId: string;
  selectedStepId: string | null;
  onSelect: (id: string | null) => void;
}

export default function StepTimeline({ companyId, selectedStepId, onSelect }: StepTimelineProps) {
  const t = useT();
  const { locale } = useLocale();
  const { steps, error, addStep } = useApplicationSteps();
  const { events } = useEvents();
  const [newStepName, setNewStepName] = useState("");

  const companySteps = steps
    .filter((step) => step.companyId === companyId)
    .sort((a, b) => a.stepOrder - b.stepOrder);
  const currentStep = getCurrentStep(companySteps);

  // 9_companyDetail.png 기준: 각 단계 아래에 날짜를 표시한다. 전형(step) 자체에는 날짜 컬럼이
  // 없으므로, 해당 단계에 연결된 일정(event) 중 가장 이른 날짜를 사용한다. 연결된 일정이
  // 없으면 표시하지 않는다(새 DB 컬럼 추가 없이 기존 events 데이터만 재사용).
  function stepDateLabel(stepId: string) {
    const dates = events
      .filter((event) => event.applicationStepId === stepId)
      .map((event) => event.startsAt ?? event.dueAt)
      .filter((value): value is string => value !== null)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (dates.length === 0) return null;
    return new Date(dates[0]).toLocaleDateString(locale === "ja" ? "ja-JP" : "ko-KR", {
      month: "2-digit",
      day: "2-digit",
    });
  }

  async function handleAddStep(event: FormEvent) {
    event.preventDefault();
    if (!newStepName.trim()) return;
    const ok = await addStep(companyId, newStepName);
    if (ok) setNewStepName("");
  }

  return (
    <section className="mb-8 rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-[16px] font-semibold text-foreground">
        {t("companies.steps.timeline")}
      </h2>

      {error && (
        <p className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {companySteps.length === 0 ? (
        <EmptyState icon={ListChecks} title={t("companies.steps.empty")} />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start">
            {companySteps.map((step, index) => {
              const isSelected = step.id === selectedStepId;
              const isCurrent = currentStep?.id === step.id;
              const isCompleted = step.stepStatus === "completed";
              const isReached = isCompleted || isCurrent;
              const dateLabel = stepDateLabel(step.id);

              return (
                <div key={step.id} className="flex items-start">
                  <button
                    type="button"
                    onClick={() => onSelect(isSelected ? null : step.id)}
                    aria-pressed={isSelected}
                    className="flex flex-col items-center gap-2 px-2 py-1"
                  >
                    <span
                      className={
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors duration-150 " +
                        (isCompleted
                          ? "border-success bg-success text-white"
                          : isCurrent
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-card text-secondary") +
                        (isSelected ? " ring-2 ring-primary/40 ring-offset-2" : "")
                      }
                    >
                      {isCompleted && <Check size={14} />}
                    </span>
                    <span
                      className={
                        "max-w-[88px] truncate text-xs " +
                        (isSelected
                          ? "font-semibold text-primary"
                          : isReached
                            ? "font-medium text-foreground"
                            : "text-secondary")
                      }
                    >
                      {getStepDisplayName(step, t)}
                    </span>
                    {dateLabel && (
                      <span className="text-[10px] text-secondary">{dateLabel}</span>
                    )}
                  </button>
                  {index < companySteps.length - 1 && (
                    <span className="mt-4 h-px w-12 shrink-0 bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleAddStep} className="mt-4 flex gap-2">
        <Input
          type="text"
          value={newStepName}
          onChange={(e) => setNewStepName(e.target.value)}
          placeholder={t("companies.steps.newStepPlaceholder")}
          containerClassName="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary">
          {t("companies.steps.addStep")}
        </Button>
      </form>
    </section>
  );
}
