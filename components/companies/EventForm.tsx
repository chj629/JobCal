"use client";

import { useState, type FormEvent } from "react";
import { EVENT_TYPES, type EventFormValues, type EventType } from "@/lib/events";
import { useT } from "@/lib/locale-context";

interface EventFormProps {
  title: string;
  initialValues: EventFormValues;
  onCancel: () => void;
  onSubmit: (values: EventFormValues) => void;
}

const fieldClass =
  "h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none";
const labelClass = "mb-1 block text-sm text-secondary";

// lib/events.ts의 EVENT_TYPE_LABELS(한국어 고정)는 그대로 두고 표시 라벨만 번역한다.
const EVENT_TYPE_LABEL_KEYS: Record<EventType, string> = {
  schedule: "companies.events.types.schedule",
  deadline: "companies.events.types.deadline",
  result_announcement: "companies.events.types.resultAnnouncement",
};

export default function EventForm({ title, initialValues, onCancel, onSubmit }: EventFormProps) {
  const t = useT();
  const [values, setValues] = useState<EventFormValues>(initialValues);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.title.trim()) {
      setError(t("companies.events.titleRequired"));
      return;
    }
    onSubmit(values);
  }

  const isSchedule = values.eventType === "schedule";
  const isDeadlineOrResult =
    values.eventType === "deadline" || values.eventType === "result_announcement";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[10px] border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-[16px] font-semibold text-foreground">{title}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>{t("companies.events.type")}</label>
            <select
              value={values.eventType}
              onChange={(e) => setValues({ ...values, eventType: e.target.value as EventType })}
              className={fieldClass}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(EVENT_TYPE_LABEL_KEYS[type])}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t("companies.events.titleLabel")}</label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              className={fieldClass}
            />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
          </div>

          {isSchedule && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t("companies.events.startsAt")}</label>
                  <input
                    type="datetime-local"
                    value={values.startsAt}
                    onChange={(e) => setValues({ ...values, startsAt: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {t("companies.events.endsAt")} <span className="text-secondary">{t("common.optional")}</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={values.endsAt}
                    onChange={(e) => setValues({ ...values, endsAt: e.target.value })}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  {t("companies.events.location")} <span className="text-secondary">{t("common.optional")}</span>
                </label>
                <input
                  type="text"
                  value={values.location}
                  onChange={(e) => setValues({ ...values, location: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t("companies.events.onlineLink")}{" "}
                  <span className="text-secondary">{t("common.optional")}</span>
                </label>
                <input
                  type="text"
                  value={values.onlineUrl}
                  onChange={(e) => setValues({ ...values, onlineUrl: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </>
          )}

          {isDeadlineOrResult && (
            <>
              <div>
                <label className={labelClass}>
                  {values.eventType === "deadline"
                    ? t("companies.events.dueAtDeadline")
                    : t("companies.events.dueAtResult")}
                </label>
                <input
                  type="datetime-local"
                  value={values.dueAt}
                  onChange={(e) => setValues({ ...values, dueAt: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {values.eventType === "deadline"
                    ? t("companies.events.submitLink")
                    : t("companies.events.resultLink")}{" "}
                  <span className="text-secondary">{t("common.optional")}</span>
                </label>
                <input
                  type="text"
                  value={values.onlineUrl}
                  onChange={(e) => setValues({ ...values, onlineUrl: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </>
          )}

          <div>
            <label className={labelClass}>
              {t("companies.events.memo")} <span className="text-secondary">{t("common.optional")}</span>
            </label>
            <textarea
              value={values.memo}
              onChange={(e) => setValues({ ...values, memo: e.target.value })}
              rows={2}
              className="w-full rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-[10px] border border-border px-4 text-sm font-medium text-secondary"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="h-10 rounded-[10px] bg-primary px-4 text-sm font-medium text-white"
            >
              {t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
