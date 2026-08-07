"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
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
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";

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
      <section className="mb-8 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-secondary">{t("companies.steps.noStepSelected")}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={16} />
          </Button>
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
    <section className="mb-8 rounded-lg border border-border bg-card p-6">
      {(stepsError || eventsError) && (
        <p className="mb-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {stepsError || eventsError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {isRenaming ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              containerClassName="min-w-0 flex-1"
              autoFocus
            />
            <Button type="button" variant="primary" size="sm" onClick={confirmRename}>
              {t("common.save")}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsRenaming(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-[16px] font-semibold text-foreground">{step.name}</h2>
            {isCurrent && (
              <Badge variant="primary" size="sm">
                {t("companies.steps.currentBadge")}
              </Badge>
            )}
          </>
        )}

        <Select
          value={step.stepStatus}
          onChange={(e) => updateStepStatus(step.id, e.target.value as StepStatus)}
          containerClassName="ml-auto w-36"
        >
          {STEP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(STEP_STATUS_LABEL_KEYS[status])}
            </option>
          ))}
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X size={16} />
        </Button>
      </div>

      {!isRenaming && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={startRename}>
            {t("companies.steps.rename")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => moveStep(step.id, "up")}
            disabled={index === 0}
            aria-label={t("companies.steps.moveUp")}
          >
            <ChevronUp size={14} />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => moveStep(step.id, "down")}
            disabled={index === companySteps.length - 1}
            aria-label={t("companies.steps.moveDown")}
          >
            <ChevronDown size={14} />
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={() => deleteStep(step.id)}>
            {t("common.delete")}
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4">
        <p className="mb-1 text-xs font-medium text-secondary">{t("companies.steps.eventsHeading")}</p>
        {stepEvents.length === 0 ? (
          <p className="text-xs text-secondary">{t("companies.steps.noEvents")}</p>
        ) : (
          stepEvents.map((event) => (
            <div key={event.id} className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="neutral" size="sm">
                {t(EVENT_TYPE_LABEL_KEYS[event.eventType])}
              </Badge>
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
