"use client";

import { useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import {
  EVENT_TYPES,
  applyExplicitEventFormat,
  deriveEventFormat,
  type EventFormat,
  type EventFormValues,
  type EventType,
} from "@/lib/events";
import { useT } from "@/lib/locale-context";
import Modal from "@/components/ui/Modal";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface EventFormProps {
  title: string;
  initialValues: EventFormValues;
  onCancel: () => void;
  onSubmit: (values: EventFormValues) => void | Promise<void>;
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
  // 형식(온라인/대면/미정)은 location/online_url 두 컬럼에서 파생한 표시값이다 — 열었을
  // 때는 StepDetailPanel/EmailAnalysisReview와 같은 lib/events.ts의 deriveEventFormat으로
  // 온라인 우선 규칙을 그대로 따른다(둘 다 값이 있는 레거시·AI 추출 데이터도 이 시점엔
  // 아무 것도 지우지 않는다).
  const [formatChoice, setFormatChoice] = useState<EventFormat>(() => deriveEventFormat(initialValues));
  // 형식 select를 실제로 바꾸거나 지금 보이는 값 입력칸을 직접 편집했을 때만 true가 된다.
  // 폼을 열어 다른 필드만 고치고 저장(제출)한 경우에는 이 값이 false로 남아, submit
  // 시점에도 location/online_url을 단일 형식 규칙으로 정리하지 않고 원래 값 그대로
  // 제출한다 — "형식을 명시적으로 확정했을 때만" 반대쪽을 지운다는 원칙을 지킨다. 취소는
  // onSubmit 자체를 호출하지 않으므로(requestClose → onCancel) 따로 다룰 필요가 없다.
  const formatTouchedRef = useRef(false);
  const [error, setError] = useState("");
  // 저장 요청이 진행 중일 때 버튼을 비활성화해 더블클릭으로 같은 요청이 중복 실행되는
  // 것을 막는다. onSubmit이 끝나면(성공/실패 상관없이) 다시 눌러볼 수 있게 되돌린다.
  const [isSaving, setIsSaving] = useState(false);
  // Modal이 fade-out 애니메이션을 끝까지 재생한 뒤에만 실제 onCancel(부모의 unmount)을
  // 부르기 위한 로컬 상태. 배경/ESC/X/취소 버튼 모두 이 함수 하나로 닫기를 요청하고,
  // 실제 정리는 Modal의 onClosed에서 한 번만 일어난다.
  const [closing, setClosing] = useState(false);
  function requestClose() {
    setClosing(true);
  }

  function handleFormatChoiceChange(next: EventFormat) {
    formatTouchedRef.current = true;
    setFormatChoice(next);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;
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
    setIsSaving(true);
    try {
      // 형식을 실제로 만졌을 때만 단일 형식 규칙(선택한 필드만 남기고 반대쪽 삭제)을
      // 적용한다 — 안 만졌으면 values(둘 다 원래 값 그대로)를 그대로 제출한다.
      const submitValues = formatTouchedRef.current
        ? applyExplicitEventFormat(
            values,
            formatChoice,
            formatChoice === "online" ? values.onlineUrl : formatChoice === "offline" ? values.location : ""
          )
        : values;
      await onSubmit(submitValues);
    } finally {
      setIsSaving(false);
    }
  }

  const isSchedule = values.eventType === "schedule";
  const isDeadlineOrResult =
    values.eventType === "deadline" || values.eventType === "result_announcement";

  return (
    <Modal
      open={!closing}
      onClosed={onCancel}
      title={title}
      onClose={requestClose}
      footer={
        <>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-full px-6 py-2.5 text-[14px] font-[500] text-primary-navy transition-colors hover:bg-black/[0.02]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            form="event-form"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary-navy px-8 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <MaterialIcon name="progress_activity" size={16} className="animate-spin" />}
            {isSaving ? t("common.loading") : t("common.save")}
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
            {/* 형식(온라인/대면/미정)은 location/online_url 두 컬럼에서 파생한 단일 선택지다
                (StepDetailPanel/EmailAnalysisReview와 동일한 lib/events.ts 헬퍼 공유) — 선택에
                따라 그에 맞는 입력칸 하나만 보여준다. 실제로 반대쪽을 지우는 시점은 여기가
                아니라 handleSubmit(형식을 만졌을 때만)이다. */}
            <FormField label={t("companies.detail.selectionDetail.format")} htmlFor="event-form-format">
              <SelectField
                id="event-form-format"
                value={formatChoice}
                onChange={(e) => handleFormatChoiceChange(e.target.value as EventFormat)}
              >
                <option value="online">{t("companies.detail.selectionDetail.online")}</option>
                <option value="offline">{t("companies.detail.selectionDetail.offline")}</option>
                <option value="undecided">{t("companies.detail.selectionDetail.noDateSet")}</option>
              </SelectField>
            </FormField>
            {formatChoice === "online" && (
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
                  onChange={(e) => {
                    formatTouchedRef.current = true;
                    setValues({ ...values, onlineUrl: e.target.value });
                  }}
                />
              </FormField>
            )}
            {formatChoice === "offline" && (
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
                  onChange={(e) => {
                    formatTouchedRef.current = true;
                    setValues({ ...values, location: e.target.value });
                  }}
                />
              </FormField>
            )}
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
