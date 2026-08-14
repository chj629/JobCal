"use client";

import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { EVENT_TYPES, type EventFormValues, type EventType } from "@/lib/events";
import { useT } from "@/lib/locale-context";
import Modal from "@/components/ui/Modal";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface EventFormProps {
  title: string;
  initialValues: EventFormValues;
  onCancel: () => void;
  onSubmit: (values: EventFormValues) => void;
}

// docs/stitch/모달다이어로그/.../screen.png의 pill 입력창(label + rounded-full input,
// bg-surface-main). components/CompanyForm.tsx가 처음 로컬로 구현한 것과 동일한 스타일을
// 이 폼도 그대로 따른다(CompanyForm 자체는 이번에 건드리지 않음). 공용 Input/Select는
// rounded-lg + 기존 색상 팔레트라 다른 화면(대시보드 등)에 영향 없도록 전역 컴포넌트는
// 바꾸지 않고 이 모달 전용 로컬 마크업으로 처리한다.
const FIELD_INPUT_CLASS =
  "w-full rounded-full border border-stitch-border bg-[#f8f9ff] px-5 py-2.5 text-[14px] text-foreground outline-none transition-all focus:border-primary-navy focus:ring-1 focus:ring-primary-navy";

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="px-1 text-[12px] font-[500] text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextField(props: InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return <input {...props} className={FIELD_INPUT_CLASS} />;
}

function SelectField({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { id: string }) {
  return (
    <div className="relative">
      <select {...props} className={FIELD_INPUT_CLASS + " appearance-none pr-10"}>
        {children}
      </select>
      <MaterialIcon
        name="expand_more"
        size={18}
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-secondary"
      />
    </div>
  );
}

function TextareaField(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string }) {
  return (
    <textarea
      {...props}
      className="w-full resize-none rounded-stitch-2xl border border-stitch-border bg-[#f8f9ff] px-5 py-2.5 text-[14px] text-foreground outline-none transition-all focus:border-primary-navy focus:ring-1 focus:ring-primary-navy"
    />
  );
}

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
    if (values.eventType === "schedule" && !values.startsAt) {
      setError(t("companies.events.startsAtRequired"));
      return;
    }
    if (
      (values.eventType === "deadline" || values.eventType === "result_announcement") &&
      !values.dueAt
    ) {
      setError(t("companies.events.dueAtRequired"));
      return;
    }
    onSubmit(values);
  }

  const isSchedule = values.eventType === "schedule";
  const isDeadlineOrResult =
    values.eventType === "deadline" || values.eventType === "result_announcement";

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-6 py-2.5 text-[14px] font-[500] text-primary-navy transition-colors hover:bg-black/[0.02]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            form="event-form"
            className="rounded-full bg-primary-navy px-8 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90"
          >
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
        <FormField label={t("companies.events.type")} htmlFor="event-form-type">
          <SelectField
            id="event-form-type"
            value={values.eventType}
            onChange={(e) => setValues({ ...values, eventType: e.target.value as EventType })}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(EVENT_TYPE_LABEL_KEYS[type])}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField label={t("companies.events.titleLabel")} htmlFor="event-form-title">
          <TextField
            id="event-form-title"
            type="text"
            value={values.title}
            onChange={(e) => {
              setValues({ ...values, title: e.target.value });
              setError("");
            }}
          />
          {error && <p className="mt-1 px-1 text-[12px] text-error">{error}</p>}
        </FormField>

        {isSchedule && (
          <>
            {/* datetime-local 네이티브 위젯은 최소폭이 있어 375/430px에서 2열이면 값이
                겹쳐 보인다. 모바일은 세로로 쌓고 sm(640px)부터 기존처럼 2열로 되돌린다. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label={t("companies.events.startsAt")} htmlFor="event-form-startsAt">
                <TextField
                  id="event-form-startsAt"
                  type="datetime-local"
                  value={values.startsAt}
                  onChange={(e) => setValues({ ...values, startsAt: e.target.value })}
                />
              </FormField>
              <FormField
                label={
                  <>
                    {t("companies.events.endsAt")}{" "}
                    <span className="text-secondary">{t("common.optional")}</span>
                  </>
                }
                htmlFor="event-form-endsAt"
              >
                <TextField
                  id="event-form-endsAt"
                  type="datetime-local"
                  value={values.endsAt}
                  onChange={(e) => setValues({ ...values, endsAt: e.target.value })}
                />
              </FormField>
            </div>
            <FormField
              label={
                <>
                  {t("companies.events.location")}{" "}
                  <span className="text-secondary">{t("common.optional")}</span>
                </>
              }
              htmlFor="event-form-location"
            >
              <TextField
                id="event-form-location"
                type="text"
                value={values.location}
                onChange={(e) => setValues({ ...values, location: e.target.value })}
              />
            </FormField>
            <FormField
              label={
                <>
                  {t("companies.events.onlineLink")}{" "}
                  <span className="text-secondary">{t("common.optional")}</span>
                </>
              }
              htmlFor="event-form-onlineUrl"
            >
              <TextField
                id="event-form-onlineUrl"
                type="text"
                value={values.onlineUrl}
                onChange={(e) => setValues({ ...values, onlineUrl: e.target.value })}
              />
            </FormField>
          </>
        )}

        {isDeadlineOrResult && (
          <>
            <FormField
              label={
                values.eventType === "deadline"
                  ? t("companies.events.dueAtDeadline")
                  : t("companies.events.dueAtResult")
              }
              htmlFor="event-form-dueAt"
            >
              <TextField
                id="event-form-dueAt"
                type="datetime-local"
                value={values.dueAt}
                onChange={(e) => setValues({ ...values, dueAt: e.target.value })}
              />
            </FormField>
            <FormField
              label={
                <>
                  {values.eventType === "deadline"
                    ? t("companies.events.submitLink")
                    : t("companies.events.resultLink")}{" "}
                  <span className="text-secondary">{t("common.optional")}</span>
                </>
              }
              htmlFor="event-form-resultUrl"
            >
              <TextField
                id="event-form-resultUrl"
                type="text"
                value={values.onlineUrl}
                onChange={(e) => setValues({ ...values, onlineUrl: e.target.value })}
              />
            </FormField>
          </>
        )}

        <FormField
          label={
            <>
              {t("companies.events.memo")}{" "}
              <span className="text-secondary">{t("common.optional")}</span>
            </>
          }
          htmlFor="event-form-memo"
        >
          <TextareaField
            id="event-form-memo"
            value={values.memo}
            onChange={(e) => setValues({ ...values, memo: e.target.value })}
            rows={2}
          />
        </FormField>
      </form>
    </Modal>
  );
}
