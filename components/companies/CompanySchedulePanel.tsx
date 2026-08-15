"use client";

import { useState } from "react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { getCurrentStep, getStepDisplayName } from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import {
  createEmptyEventFormValues,
  eventToFormValues,
  type AppEvent,
} from "@/lib/events";
import { formatTimeOfDay } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import EventForm from "@/components/companies/EventForm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import MaterialIcon from "@/components/ui/MaterialIcon";
import Modal from "@/components/ui/Modal";

interface CompanySchedulePanelProps {
  companyId: string;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "今後の予定" 카드.
// 기존에는 읽기 전용 요약이라 추가/수정/삭제는 StepTimeline이 선택한 전형의 상세 패널에서만
// 가능했는데, Stitch 화면은 이 카드 자체에 追加 진입점이 있다. 수정/삭제는 Calendar의
// EventDetailPopover와 동일하게 hover ⋮ 메뉴 대신 직접 노출된 아이콘 버튼을 쓴다.
// EventForm/addEvent/updateEvent/deleteEvent는 기존 로직 그대로 재사용한다. 새 일정을
// 추가할 전형은 Calendar의 CalendarAddEventFlow와 동일한 select(+ getStepDisplayName)로
// 이 기업의 전형 중 고를 수 있게 하되, 기본값은 지금까지와 같은 getCurrentStep()이다
// (Calendar와 달리 기업은 이미 정해져 있으므로 전형 선택 단계만 재사용한다). 기존
// 이벤트의 소속 전형은 여기서 바꾸지 않는다(수정은 항상 원래 전형 그대로 updateEvent).
export default function CompanySchedulePanel({ companyId }: CompanySchedulePanelProps) {
  const t = useT();
  const { steps } = useApplicationSteps();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const [eventFormState, setEventFormState] = useState<{ event: AppEvent | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppEvent | null>(null);
  const [isSelectingStep, setIsSelectingStep] = useState(false);
  const [newEventStepId, setNewEventStepId] = useState("");

  const companySteps = steps
    .filter((step) => step.companyId === companyId)
    .sort((a, b) => a.stepOrder - b.stepOrder);
  const currentStep = getCurrentStep(companySteps);

  const rows = events
    .filter((event) => event.companyId === companyId)
    .map((event) => ({ event, at: event.startsAt ?? event.dueAt }))
    .filter((row): row is { event: AppEvent; at: string } => row.at !== null)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  function formatDate(iso: string) {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteEvent(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
          <MaterialIcon name="schedule" size={17} className="text-secondary" />
          {t("companies.detail.schedulePanel.title")}
        </h3>
        {currentStep && (
          <button
            type="button"
            onClick={() => {
              setNewEventStepId(currentStep.id);
              setIsSelectingStep(true);
            }}
            className="flex items-center gap-0.5 rounded-stitch-md px-2 py-1 text-[11px] font-[400] text-primary-navy transition-colors hover:bg-black/[0.02]"
          >
            <MaterialIcon name="add" size={14} />
            {t("common.add")}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="schedule" title={t("companies.detail.schedulePanel.empty")} />
      ) : (
        <div className="space-y-1">
          {rows.map(({ event, at }, index) => (
            <div
              key={event.id}
              className="group -mx-2 flex items-start gap-3 rounded-stitch-xl px-2 py-1.5 transition-colors hover:bg-black/[0.015]"
            >
              <div className="flex w-10 shrink-0 flex-col items-end pt-0.5">
                <p className="text-[12px] font-[400] leading-none tracking-tight text-stitch-ink">
                  {formatDate(at)}
                </p>
                <p className="mt-1 text-[11px] leading-none tracking-tight text-secondary">
                  {formatTimeOfDay(at)}
                </p>
              </div>
              <div
                className={
                  "flex min-w-0 flex-1 flex-col gap-0.5 border-l-[3px] py-0.5 pl-3 " +
                  (index === 0 ? "border-primary-navy" : "border-stitch-border")
                }
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-[13px] font-[400] leading-tight text-stitch-ink">
                    {event.title}
                  </p>
                  <div className="flex shrink-0 gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEventFormState({ event })}
                      className="rounded-stitch-md border border-stitch-border bg-white p-1.5 text-secondary shadow-sm hover:bg-[#f8f9ff]"
                      aria-label={t("common.edit")}
                    >
                      <MaterialIcon name="edit" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(event)}
                      className="rounded-stitch-md border border-stitch-border bg-white p-1.5 text-secondary shadow-sm hover:bg-[#f8f9ff] hover:text-error"
                      aria-label={t("common.delete")}
                    >
                      <MaterialIcon name="delete" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSelectingStep && (
        <Modal
          title={t("companies.steps.addEventModalTitle")}
          onClose={() => setIsSelectingStep(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsSelectingStep(false)}
                className="rounded-full px-6 py-2.5 text-[14px] font-[500] text-primary-navy transition-colors hover:bg-black/[0.02]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSelectingStep(false);
                  setEventFormState({ event: null });
                }}
                className="rounded-full bg-primary-navy px-8 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90"
              >
                {t("common.next")}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="schedule-panel-step-select"
              className="px-1 text-[12px] font-[500] text-foreground"
            >
              {t("calendar.addEvent.stepLabel")}
            </label>
            <div className="relative">
              <select
                id="schedule-panel-step-select"
                value={newEventStepId}
                onChange={(e) => setNewEventStepId(e.target.value)}
                className="w-full appearance-none rounded-full border border-stitch-border bg-[#f8f9ff] px-5 py-2.5 pr-10 text-[14px] text-foreground outline-none transition-all focus:border-primary-navy focus:ring-1 focus:ring-primary-navy"
              >
                {companySteps.map((step) => (
                  <option key={step.id} value={step.id}>
                    {getStepDisplayName(step, t)}
                  </option>
                ))}
              </select>
              <MaterialIcon
                name="expand_more"
                size={18}
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-secondary"
              />
            </div>
          </div>
        </Modal>
      )}

      {eventFormState && (
        <EventForm
          title={
            eventFormState.event
              ? t("companies.steps.editEventModalTitle")
              : t("companies.steps.addEventModalTitle")
          }
          initialValues={
            eventFormState.event ? eventToFormValues(eventFormState.event) : createEmptyEventFormValues()
          }
          onCancel={() => setEventFormState(null)}
          onSubmit={async (values) => {
            const ok = eventFormState.event
              ? await updateEvent(eventFormState.event.id, values)
              : await addEvent(companyId, newEventStepId, values);
            if (ok) setEventFormState(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("companies.events.deleteConfirm", { title: deleteTarget?.title ?? "" })}
        description={t("common.cannotUndo")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
