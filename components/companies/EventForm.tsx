"use client";

import { useState, type FormEvent } from "react";
import { EVENT_TYPES, type EventFormValues, type EventType } from "@/lib/events";
import { useT } from "@/lib/locale-context";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

interface EventFormProps {
  title: string;
  initialValues: EventFormValues;
  onCancel: () => void;
  onSubmit: (values: EventFormValues) => void;
}

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
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          label={t("companies.events.type")}
          value={values.eventType}
          onChange={(e) => setValues({ ...values, eventType: e.target.value as EventType })}
        >
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(EVENT_TYPE_LABEL_KEYS[type])}
            </option>
          ))}
        </Select>

        <Input
          label={t("companies.events.titleLabel")}
          type="text"
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
          error={error}
        />

        {isSchedule && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t("companies.events.startsAt")}
                type="datetime-local"
                value={values.startsAt}
                onChange={(e) => setValues({ ...values, startsAt: e.target.value })}
              />
              <Input
                label={
                  <>
                    {t("companies.events.endsAt")}{" "}
                    <span className="text-secondary">{t("common.optional")}</span>
                  </>
                }
                type="datetime-local"
                value={values.endsAt}
                onChange={(e) => setValues({ ...values, endsAt: e.target.value })}
              />
            </div>
            <Input
              label={
                <>
                  {t("companies.events.location")}{" "}
                  <span className="text-secondary">{t("common.optional")}</span>
                </>
              }
              type="text"
              value={values.location}
              onChange={(e) => setValues({ ...values, location: e.target.value })}
            />
            <Input
              label={
                <>
                  {t("companies.events.onlineLink")}{" "}
                  <span className="text-secondary">{t("common.optional")}</span>
                </>
              }
              type="text"
              value={values.onlineUrl}
              onChange={(e) => setValues({ ...values, onlineUrl: e.target.value })}
            />
          </>
        )}

        {isDeadlineOrResult && (
          <>
            <Input
              label={
                values.eventType === "deadline"
                  ? t("companies.events.dueAtDeadline")
                  : t("companies.events.dueAtResult")
              }
              type="datetime-local"
              value={values.dueAt}
              onChange={(e) => setValues({ ...values, dueAt: e.target.value })}
            />
            <Input
              label={
                <>
                  {values.eventType === "deadline"
                    ? t("companies.events.submitLink")
                    : t("companies.events.resultLink")}{" "}
                  <span className="text-secondary">{t("common.optional")}</span>
                </>
              }
              type="text"
              value={values.onlineUrl}
              onChange={(e) => setValues({ ...values, onlineUrl: e.target.value })}
            />
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
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary">
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
