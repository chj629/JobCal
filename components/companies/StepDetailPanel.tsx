"use client";

import { useState } from "react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { STEP_STATUSES, STEP_STATUS_LABELS, getCurrentStep, type StepStatus } from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import {
  EVENT_TYPE_LABELS,
  createEmptyEventFormValues,
  eventToFormValues,
  type AppEvent,
} from "@/lib/events";
import EventForm from "@/components/companies/EventForm";

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
          <p className="text-sm text-secondary">전형을 선택하면 상세 내용이 표시됩니다.</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
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
              저장
            </button>
            <button type="button" onClick={() => setIsRenaming(false)} className={iconButtonClass}>
              취소
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-[16px] font-semibold text-foreground">{step.name}</h2>
            {isCurrent && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                현재 전형
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
              {STEP_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-border text-secondary hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {!isRenaming && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={startRename} className={iconButtonClass}>
            이름 변경
          </button>
          <button
            type="button"
            onClick={() => moveStep(step.id, "up")}
            disabled={index === 0}
            className={iconButtonClass}
            aria-label="위로 이동"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => moveStep(step.id, "down")}
            disabled={index === companySteps.length - 1}
            className={iconButtonClass}
            aria-label="아래로 이동"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => deleteStep(step.id)}
            className="h-9 rounded-[8px] border border-error px-2 text-xs font-medium text-error"
          >
            삭제
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4">
        <p className="mb-1 text-xs font-medium text-secondary">일정</p>
        {stepEvents.length === 0 ? (
          <p className="text-xs text-secondary">등록된 일정이 없습니다.</p>
        ) : (
          stepEvents.map((event) => (
            <div key={event.id} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-background px-2 py-0.5 font-medium text-foreground">
                {EVENT_TYPE_LABELS[event.eventType]}
              </span>
              <span className="truncate text-foreground">{event.title}</span>
              <span className="text-secondary">
                {formatEventDate(event.startsAt ?? event.dueAt) ?? "일시 미정"}
              </span>
              <button
                type="button"
                onClick={() => setEventFormState({ event })}
                className="text-secondary hover:text-primary hover:underline"
              >
                수정
              </button>
              <button
                type="button"
                onClick={() => deleteEvent(event.id)}
                className="text-secondary hover:text-error hover:underline"
              >
                삭제
              </button>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={() => setEventFormState({ event: null })}
          className="self-start text-xs font-medium text-primary hover:underline"
        >
          + 일정 추가
        </button>
      </div>

      {eventFormState && (
        <EventForm
          title={eventFormState.event ? "일정 수정" : "일정 추가"}
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
