"use client";

import { useState } from "react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { getCurrentStep } from "@/lib/applicationSteps";
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

interface CompanySchedulePanelProps {
  companyId: string;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "今後の予定" 카드.
// 기존에는 읽기 전용 요약이라 추가/수정/삭제는 StepTimeline이 선택한 전형의 상세 패널에서만
// 가능했는데, Stitch 화면은 이 카드 자체에 追加·⋮ 편집 진입점이 있다. EventForm/addEvent
// /updateEvent/deleteEvent는 기존 로직 그대로 재사용하고, 새 일정은 현재 전형(getCurrentStep)에
// 연결한다(어떤 전형에 붙일지 고를 UI가 Stitch에 없어 가장 자연스러운 기본값을 골랐다).
export default function CompanySchedulePanel({ companyId }: CompanySchedulePanelProps) {
  const t = useT();
  const { steps } = useApplicationSteps();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const [eventFormState, setEventFormState] = useState<{ event: AppEvent | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppEvent | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const companySteps = steps.filter((step) => step.companyId === companyId);
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
        <h3 className="flex items-center gap-1.5 text-[13px] font-[400] text-stitch-ink">
          <MaterialIcon name="schedule" size={15} className="text-secondary" />
          {t("companies.detail.schedulePanel.title")}
        </h3>
        {currentStep && (
          <button
            type="button"
            onClick={() => setEventFormState({ event: null })}
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
                <p className="text-[11px] font-[400] leading-none tracking-tight text-stitch-ink">
                  {formatDate(at)}
                </p>
                <p className="mt-1 text-[10px] leading-none tracking-tight text-secondary">
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
                  <p className="truncate text-[12px] font-[400] leading-tight text-stitch-ink">
                    {event.title}
                  </p>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveMenuId((id) => (id === event.id ? null : event.id))}
                      className="rounded-stitch-md border border-transparent p-1 text-secondary opacity-0 shadow-sm transition-opacity hover:border-stitch-border hover:bg-white group-hover:opacity-100"
                    >
                      <MaterialIcon name="more_vert" size={14} />
                    </button>
                    {activeMenuId === event.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenuId(null)}
                        />
                        <div className="absolute right-0 top-7 z-20 w-28 rounded-stitch-md border border-stitch-border bg-card py-1 text-left shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setEventFormState({ event });
                              setActiveMenuId(null);
                            }}
                            className="block w-full px-3 py-1.5 text-left text-[11px] text-stitch-ink hover:bg-[#f8f9ff]"
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(event);
                              setActiveMenuId(null);
                            }}
                            className="block w-full px-3 py-1.5 text-left text-[11px] text-error hover:bg-[#f8f9ff]"
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {eventFormState && currentStep && (
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
              : await addEvent(companyId, currentStep.id, values);
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
