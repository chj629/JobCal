"use client";

import { useState, type FormEvent } from "react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { getCurrentStep } from "@/lib/applicationSteps";
import { useT } from "@/lib/locale-context";

interface StepTimelineProps {
  companyId: string;
  selectedStepId: string | null;
  onSelect: (id: string | null) => void;
}

export default function StepTimeline({ companyId, selectedStepId, onSelect }: StepTimelineProps) {
  const t = useT();
  const { steps, error, addStep } = useApplicationSteps();
  const [newStepName, setNewStepName] = useState("");

  const companySteps = steps
    .filter((step) => step.companyId === companyId)
    .sort((a, b) => a.stepOrder - b.stepOrder);
  const currentStep = getCurrentStep(companySteps);

  async function handleAddStep(event: FormEvent) {
    event.preventDefault();
    if (!newStepName.trim()) return;
    const ok = await addStep(companyId, newStepName);
    if (ok) setNewStepName("");
  }

  return (
    <section className="mb-8 rounded-[10px] border border-border bg-card p-6">
      <h2 className="mb-4 text-[16px] font-semibold text-foreground">
        {t("companies.steps.timeline")}
      </h2>

      {error && (
        <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {companySteps.length === 0 ? (
        <p className="py-6 text-center text-sm text-secondary">{t("companies.steps.empty")}</p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start">
            {companySteps.map((step, index) => {
              const isSelected = step.id === selectedStepId;
              const isCurrent = currentStep?.id === step.id;
              const isCompleted = step.stepStatus === "completed";

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => onSelect(isSelected ? null : step.id)}
                    aria-pressed={isSelected}
                    className="flex flex-col items-center gap-1.5 px-2 py-1"
                  >
                    <span
                      className={
                        "flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-semibold " +
                        (isCurrent
                          ? "border-primary bg-primary text-white"
                          : isCompleted
                            ? "border-border bg-border text-white"
                            : "border-border bg-card text-secondary") +
                        (isSelected ? " ring-2 ring-primary/40 ring-offset-2" : "")
                      }
                    >
                      {isCompleted ? "✓" : ""}
                    </span>
                    <span
                      className={
                        "max-w-[72px] truncate text-xs " +
                        (isSelected ? "font-semibold text-primary" : "text-secondary")
                      }
                    >
                      {step.name}
                    </span>
                  </button>
                  {index < companySteps.length - 1 && (
                    <span className="mb-5 h-px w-8 shrink-0 bg-border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleAddStep} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newStepName}
          onChange={(e) => setNewStepName(e.target.value)}
          placeholder={t("companies.steps.newStepPlaceholder")}
          className="h-10 flex-1 rounded-[10px] border border-border bg-card px-3 text-sm text-foreground placeholder:text-secondary focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-[10px] border border-border px-4 text-sm font-medium text-foreground"
        >
          {t("companies.steps.addStep")}
        </button>
      </form>
    </section>
  );
}
