"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import MaterialIcon from "@/components/ui/MaterialIcon";
import {
  STEP_STATUSES,
  STEP_STATUS_LABEL_KEYS,
  getStepDisplayName,
  type ApplicationStep,
  type StepStatus,
} from "@/lib/applicationSteps";
import { useT } from "@/lib/locale-context";

interface StepReconcileDialogProps {
  companyName: string;
  incompleteSteps: ApplicationStep[];
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onSaveWithoutChanges: () => void;
  onSaveWithChanges: (changes: Record<string, StepStatus>) => void;
}

// useStepReconcileCheck과 함께 쓰는 확인 모달. 미완료 전형을 하나도 자동으로 completed로
// 바꾸지 않는다 — 각 행의 select 기본값은 저장된 stepStatus 그대로이고, 사용자가 실제로
// 바꾼 행만 onSaveWithChanges로 넘어간다. select 자체는 StepDetailPanel.tsx와 동일한
// STEP_STATUSES/STEP_STATUS_LABEL_KEYS·스타일을 재사용한다.
export default function StepReconcileDialog({
  companyName,
  incompleteSteps,
  isSaving,
  error,
  onCancel,
  onSaveWithoutChanges,
  onSaveWithChanges,
}: StepReconcileDialogProps) {
  const t = useT();
  const [draft, setDraft] = useState<Record<string, StepStatus>>(() =>
    Object.fromEntries(incompleteSteps.map((step) => [step.id, step.stepStatus]))
  );

  function handleSaveWithChanges() {
    const changes: Record<string, StepStatus> = {};
    for (const step of incompleteSteps) {
      if (draft[step.id] !== step.stepStatus) {
        changes[step.id] = draft[step.id];
      }
    }
    onSaveWithChanges(changes);
  }

  return (
    <Modal
      title={t("companies.stepReconcile.title")}
      description={t("companies.stepReconcile.description", { name: companyName })}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-full px-6 py-2.5 text-[14px] font-[500] text-secondary transition-colors hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("companies.stepReconcile.cancel")}
          </button>
          <button
            type="button"
            onClick={onSaveWithoutChanges}
            disabled={isSaving}
            className="rounded-full border border-stitch-border px-6 py-2.5 text-[14px] font-[500] text-primary-navy transition-all hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("companies.stepReconcile.saveWithoutChanges")}
          </button>
          <button
            type="button"
            onClick={handleSaveWithChanges}
            disabled={isSaving}
            className="rounded-full bg-primary-navy px-6 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? t("common.loading") : t("companies.stepReconcile.saveWithChanges")}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {error && (
          <p className="rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-[13px] text-error">
            {error}
          </p>
        )}

        {incompleteSteps.map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between gap-4 rounded-stitch-xl border border-stitch-border bg-[#f8f9ff] px-4 py-3"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] text-stitch-ink">
              {getStepDisplayName(step, t)}
            </span>
            <div className="relative shrink-0">
              <select
                value={draft[step.id]}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [step.id]: e.target.value as StepStatus }))
                }
                disabled={isSaving}
                className="cursor-pointer appearance-none rounded-stitch-md border border-stitch-border bg-white py-1 pl-3 pr-8 text-[13px] text-stitch-ink outline-none focus:ring-1 focus:ring-primary-navy/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {STEP_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(STEP_STATUS_LABEL_KEYS[status])}
                  </option>
                ))}
              </select>
              <MaterialIcon
                name="expand_more"
                size={14}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-secondary"
              />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
