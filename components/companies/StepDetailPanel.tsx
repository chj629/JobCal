"use client";

import { useState } from "react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import {
  STEP_STATUSES,
  STEP_STATUS_LABEL_KEYS,
  getCurrentStep,
  getStepDisplayName,
  type StepStatus,
} from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import { useT } from "@/lib/locale-context";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface StepDetailPanelProps {
  companyId: string;
  selectedStepId: string | null;
  onClose: () => void;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "選考詳細" 섹션.
// 예전엔 전형을 선택했을 때만 나타나는 별도 패널이었지만, Stitch는 항상 보이는 카드 하나로
// "선택된 전형(없으면 현재 전형)"의 상태/다음 단계/일시/형식을 보여준다. 상태 변경/이름
// 변경/순서 변경/삭제는 기존 useApplicationSteps 로직을 그대로 재사용한다. 일정 추가/수정은
// CompanySchedulePanel(今後の予定)로 옮겨서 여기서는 다루지 않는다.
export default function StepDetailPanel({ companyId, selectedStepId }: StepDetailPanelProps) {
  const t = useT();
  const { steps, error: stepsError, deleteStep, renameStep, updateStepStatus, moveStep } =
    useApplicationSteps();
  const { events, refresh: refreshEvents } = useEvents();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const companySteps = steps
    .filter((step) => step.companyId === companyId)
    .sort((a, b) => a.stepOrder - b.stepOrder);
  const currentStep = getCurrentStep(companySteps);
  const step = companySteps.find((s) => s.id === selectedStepId) ?? currentStep;

  if (!step) return null;

  const index = companySteps.findIndex((s) => s.id === step.id);
  const stepEvents = events
    .filter((event) => event.applicationStepId === step.id)
    .map((event) => ({ event, at: event.startsAt ?? event.dueAt }))
    .filter((row): row is { event: (typeof events)[number]; at: string } => row.at !== null)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const nextEvent = stepEvents[0];

  function startRename() {
    setRenameValue(step!.name);
    setIsRenaming(true);
    setIsMenuOpen(false);
  }

  async function confirmRename() {
    if (!renameValue.trim()) {
      setIsRenaming(false);
      return;
    }
    const ok = await renameStep(step!.id, renameValue);
    if (ok) setIsRenaming(false);
  }

  async function handleConfirmDeleteStep() {
    const ok = await deleteStep(step!.id);
    if (ok) refreshEvents();
    setIsDeleteConfirmOpen(false);
  }

  function formatDateTime(iso: string, endsAt: string | null) {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const base = `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    if (!endsAt) return base;
    const end = new Date(endsAt);
    return `${base}-${pad(end.getHours())}:${pad(end.getMinutes())}`;
  }

  return (
    <section className="relative">
      {stepsError && (
        <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {stepsError}
        </p>
      )}

      <h2 className="mb-4 flex items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="assignment" size={17} className="text-secondary" />
        {t("companies.detail.selectionDetail.title")}
      </h2>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen((v) => !v)}
          className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-stitch-xl border border-stitch-border bg-card text-secondary shadow-sm transition-colors hover:bg-[#f8f9ff]"
          aria-label={t("companies.detail.selectionDetail.moreMenu")}
        >
          <MaterialIcon name="more_vert" size={18} />
        </button>
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute right-0 top-9 z-20 w-36 rounded-stitch-md border border-stitch-border bg-card py-1 text-left shadow-lg">
              <button
                type="button"
                onClick={startRename}
                className="block w-full px-3 py-2 text-left text-[13px] text-stitch-ink hover:bg-[#f8f9ff]"
              >
                {t("companies.steps.rename")}
              </button>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  moveStep(step!.id, "up");
                  setIsMenuOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-[13px] text-stitch-ink hover:bg-[#f8f9ff] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("companies.steps.moveUp")}
              </button>
              <button
                type="button"
                disabled={index === companySteps.length - 1}
                onClick={() => {
                  moveStep(step!.id, "down");
                  setIsMenuOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-[13px] text-stitch-ink hover:bg-[#f8f9ff] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("companies.steps.moveDown")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(true);
                  setIsMenuOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-[13px] text-error hover:bg-[#f8f9ff]"
              >
                {t("common.delete")}
              </button>
            </div>
          </>
        )}

        <div className="space-y-4 pl-6">
          <div className="flex items-center gap-4">
            <span className="w-20 shrink-0 text-[11px] font-[400] text-secondary">
              {t("companies.detail.selectionDetail.status")}
            </span>
            <div className="relative">
              <select
                value={step.stepStatus}
                onChange={(e) => updateStepStatus(step!.id, e.target.value as StepStatus)}
                className="cursor-pointer appearance-none rounded-stitch-md border border-stitch-border bg-[#f8f9ff] py-1 pl-3 pr-8 text-[13px] text-stitch-ink outline-none focus:ring-1 focus:ring-primary-navy/50"
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

          <div className="flex items-start gap-4">
            <span className="w-20 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
              {t("companies.detail.selectionDetail.nextStep")}
            </span>
            {isRenaming ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[13px] text-stitch-ink outline-none"
                />
                <button
                  type="button"
                  onClick={confirmRename}
                  className="shrink-0 rounded-stitch-md bg-primary-navy px-2 py-1 text-[11px] text-white"
                >
                  {t("common.save")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  className="shrink-0 rounded-stitch-md px-2 py-1 text-[11px] text-secondary hover:bg-black/[0.02]"
                >
                  {t("common.cancel")}
                </button>
              </div>
            ) : (
              <span className="text-[13px] font-[400] text-stitch-ink">
                {getStepDisplayName(step, t)}
              </span>
            )}
          </div>

          <div className="flex items-start gap-4">
            <span className="w-20 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
              {t("companies.detail.selectionDetail.datetime")}
            </span>
            <span className="text-[13px] text-stitch-ink">
              {nextEvent
                ? formatDateTime(nextEvent.at, nextEvent.event.endsAt)
                : t("companies.detail.selectionDetail.noDateSet")}
            </span>
          </div>

          <div className="flex items-start gap-4">
            <span className="w-20 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
              {t("companies.detail.selectionDetail.format")}
            </span>
            <span className="text-[13px] text-stitch-ink">
              {nextEvent?.event.onlineUrl
                ? t("companies.detail.selectionDetail.online")
                : (nextEvent?.event.location ?? t("companies.detail.selectionDetail.noDateSet"))}
            </span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title={t("companies.steps.deleteConfirm", { name: getStepDisplayName(step, t) })}
        description={t("common.cannotUndo")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteStep}
      />
    </section>
  );
}
