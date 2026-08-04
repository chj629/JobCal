"use client";

import { useState } from "react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { STEP_STATUSES, getCurrentStep, type StepStatus } from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import {
  createEmptyEventFormValues,
  eventToFormValues,
  type AppEvent,
  type EventType,
} from "@/lib/events";
import { useT } from "@/lib/locale-context";
import EventForm from "@/components/companies/EventForm";

// lib/applicationSteps.ts의 STEP_STATUS_LABELS(한국어 고정)는 그대로 두고,
// 표시 라벨만 companies.steps.statusLabels.*로 번역한다. 내부 enum 값은 불변.
const STEP_STATUS_LABEL_KEYS: Record<StepStatus, string> = {
  waiting: "companies.steps.statusLabels.waiting",
  action_required: "companies.steps.statusLabels.actionRequired",
  scheduled: "companies.steps.statusLabels.scheduled",
  completed: "companies.steps.statusLabels.completed",
};

// lib/events.ts의 EVENT_TYPE_LABELS(한국어 고정)도 그대로 두고 표시 라벨만 번역한다.
const EVENT_TYPE_LABEL_KEYS: Record<EventType, string> = {
  schedule: "companies.events.types.schedule",
  deadline: "companies.events.types.deadline",
  result_announcement: "companies.events.types.resultAnnouncement",
};

interface StepDetailPanelProps {
  companyId: string;
  selectedStepId: string | null;
  onClose: () => void;
}

const selectClass =
  "h-9 rounded-[8px] border border-border bg-card px-2 text-xs text-foreground focus:border-primary focus:outline-none";
const iconButtonClass =
  "h-9 rounded-[8px] border border-border px-2 text-xs font-medium text-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

function formatEventDate(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function StepDetailPanel({ companyId, selectedStepId, onClose }: StepDetailPanelProps) {
  const t = useT();
  const {
    steps,
    error: stepsError,
    deleteStep,
    renameStep,
    updateStepStatus,
    moveStep,
  } = useApplicationSteps();
  const { events, error: eventsError, addEvent, updateEvent, deleteEvent } = useEvents();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [eventFormState, setEventFormState] = useState<{ event: AppEvent | null } | null>(null);

  const companySteps = steps
    .filter((step) => step.companyId === companyId)
    .sort((a, b) => a.stepOrder - b.stepOrder);
  const currentStep = getCurrentStep(companySteps);
  const step = companySteps.find((s) => s.id === selectedStepId);

  if (!step) {
    return (
      <section className="mb-8 rounded-[10px] border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-secondary">{t("companies.steps.noStepSelected")}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-border text-secondary hover:text-foreground"
          >
            ✕
          </button>
        </div>
      </section>
    );
  }

  const index = companySteps.findIndex((s) => s.id === step.id);
  const stepEvents = events.filter((event) => event.applicationStepId === step.id);
  const isCurrent = currentStep?.id === step.id;

  function startRename() {
    setRenameValue(step!.name);
    setIsRenaming(true);
  }

  async function confirmRename() {
    if (!renameValue.trim()) return;
    const ok = await renameStep(step!.id, renameValue);
    if (ok) setIsRenaming(false);
  }

  return (
    <section className="mb-8 rounded-[10px] border border-border bg-card p-6">
      {(stepsError || eventsError) && (
        <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {stepsError || eventsError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {isRenaming ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-[8px] border border-border bg-card px-2 text-sm text-foreground focus:border-primary focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={confirmRename}
              className="h-9 rounded-[8px] bg-primary px-3 text-xs font-medium text-white"
            >
              {t("common.save")}
            </button>
            <button type="button" onClick={() => setIsRenaming(false)} className={iconButtonClass}>
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-[16px] font-semibold text-foreground">{step.name}</h2>
            {isCurrent && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {t("companies.steps.currentBadge")}
              </span>
            )}
          </>
        )}

        <select
          value={step.stepStatus}
          onChange={(e) => updateStepStatus(step.id, e.target.value as StepStatus)}
          className={selectClass + " ml-auto"}
        >
          {STEP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(STEP_STATUS_LABEL_KEYS[status])}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-border text-secondary hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {!isRenaming && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={startRename} className={iconButtonClass}>
            {t("companies.steps.rename")}
          </button>
          <button
            type="button"
            onClick={() => moveStep(step.id, "up")}
            disabled={index === 0}
            className={iconButtonClass}
            aria-label={t("companies.steps.moveUp")}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => moveStep(step.id, "down")}
            disabled={index === companySteps.length - 1}
            className={iconButtonClass}
            aria-label={t("companies.steps.moveDown")}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => deleteStep(step.id)}
            className="h-9 rounded-[8px] border border-error px-2 text-xs font-medium text-error"
          >
            {t("common.delete")}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4">
        <p className="mb-1 text-xs font-medium text-secondary">{t("companies.steps.eventsHeading")}</p>
        {stepEvents.length === 0 ? (
          <p className="text-xs text-secondary">{t("companies.steps.noEvents")}</p>
        ) : (
          stepEvents.map((event) => (
            <div key={event.id} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-background px-2 py-0.5 font-medium text-foreground">
                {t(EVENT_TYPE_LABEL_KEYS[event.eventType])}
              </span>
              <span className="truncate text-foreground">{event.title}</span>
              <span className="text-secondary">
                {formatEventDate(event.startsAt ?? event.dueAt) ?? t("companies.steps.noDateSet")}
              </span>
              <button
                type="button"
                onClick={() => setEventFormState({ event })}
                className="text-secondary hover:text-primary hover:underline"
              >
                {t("common.edit")}
              </button>
              <button
                type="button"
                onClick={() => deleteEvent(event.id)}
                className="text-secondary hover:text-error hover:underline"
              >
                {t("common.delete")}
              </button>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={() => setEventFormState({ event: null })}
          className="self-start text-xs font-medium text-primary hover:underline"
        >
          {t("companies.steps.addEvent")}
        </button>
      </div>

      {eventFormState && (
        <EventForm
          title={
            eventFormState.event
              ? t("companies.steps.editEventModalTitle")
              : t("companies.steps.addEventModalTitle")
          }
          initialValues={
            eventFormState.event
              ? eventToFormValues(eventFormState.event)
              : createEmptyEventFormValues()
          }
          onCancel={() => setEventFormState(null)}
          onSubmit={async (values) => {
            const ok = eventFormState.event
              ? await updateEvent(eventFormState.event.id, values)
              : await addEvent(companyId, step.id, values);
            if (ok) setEventFormState(null);
          }}
        />
      )}
    </section>
  );
}
