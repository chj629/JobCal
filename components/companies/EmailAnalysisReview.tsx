"use client";

import { useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { useEvents } from "@/lib/events-context";
import { useCompanyContacts } from "@/lib/company-contacts-context";
import { useCompanyNotes } from "@/lib/company-notes-context";
import {
  OVERALL_STATUSES,
  PRIORITIES,
  createEmptyCompanyFormValues,
  type Company,
  type CompanyFormValues,
  type OverallStatus,
  type Priority,
} from "@/lib/companies";
import { DEFAULT_STEP_KEYS, getStepDisplayName } from "@/lib/applicationSteps";
import {
  EVENT_TYPES,
  createEmptyEventFormValues,
  isoToDatetimeLocal,
  type EventFormValues,
  type EventType,
} from "@/lib/events";
import { createEmptyContactFormValues, type ContactFormValues } from "@/lib/companyContacts";
import type { EmailAnalysisResult, ExtractedEvent } from "@/lib/ai/emailAnalysis";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useToast } from "@/components/ui/Toast";

interface EmailAnalysisReviewProps {
  analysis: EmailAnalysisResult;
  existingCompany: Company | null;
  onBack: () => void;
  onDone: (companyId: string, companyName: string) => void;
  // EmailPasteForm과 동일한 목적 — 제공되면 footer 버튼을 Drawer의 고정 footer로 portal.
  footerContainer?: HTMLDivElement | null;
}

// 아래 두 맵은 lib/companies.ts, lib/events.ts의 *_LABELS(한국어 고정)를 건드리지 않고,
// 기업 상세/기업 목록 단계에서 이미 만든 번역 키를 재사용하기 위한 것이다.
const STATUS_LABEL_KEYS: Record<OverallStatus, string> = {
  in_progress: "companies.list.status.inProgress",
  offer: "companies.list.status.offer",
  joined: "companies.list.status.joined",
  rejected: "companies.list.status.rejected",
  cancelled: "companies.list.status.cancelled",
};
const EVENT_TYPE_LABEL_KEYS: Record<EventType, string> = {
  schedule: "companies.events.types.schedule",
  deadline: "companies.events.types.deadline",
  result_announcement: "companies.events.types.resultAnnouncement",
};
const RESULT_OPTION_KEYS = ["inProgress", "passed", "failed", "withdrawn"] as const;
const FORMAT_OPTION_KEYS = ["online", "offline", "undecided"] as const;
const REMINDER_OPTION_KEYS = ["min15", "min30", "hour1", "day1"] as const;

// docs/stitch/AI Drawer/*의 공통 필드 스타일(rounded-full input, text-[12px] label). 공용
// Input/Button 컴포넌트는 건드리지 않고 이 화면 전용 마크업으로만 쓴다.
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="px-2 text-[12px] font-[500] text-stitch-ink">{label}</p>
      {children}
    </div>
  );
}

const fieldInputClass =
  "w-full rounded-full border border-stitch-border bg-white px-4 py-2.5 text-[14px] text-stitch-ink outline-none transition-all focus:border-primary-navy/30 focus:bg-stitch-bg";

// 일정 dedup 비교용: 타입별로 실제 의미 있는 시각 필드만 ISO 문자열로 뽑는다
// (schedule은 startsAt, deadline/result_announcement는 dueAt).
function formEventTimeIso(value: EventFormValues): string | null {
  const raw = value.eventType === "schedule" ? value.startsAt : value.dueAt;
  return raw ? new Date(raw).toISOString() : null;
}

function extractedEventToFormValues(event: ExtractedEvent): EventFormValues {
  return {
    eventType: event.eventType,
    title: event.title,
    startsAt: isoToDatetimeLocal(event.startsAt),
    endsAt: isoToDatetimeLocal(event.endsAt),
    dueAt: isoToDatetimeLocal(event.dueAt),
    location: event.location ?? "",
    onlineUrl: event.onlineUrl ?? "",
    memo: event.memo ?? "",
  };
}

// docs/stitch/AI Drawer/jobcal_dashboard_ai_drawer_step_3_sophisticated_refresh의 "内容を確認"
// 화면. Stitch 목업은 이벤트/담당자를 각각 1개만 가정한 단일 폼이지만, 실제 앱은 이메일
// 하나에서 여러 일정·담당자가 추출될 수 있어(기존 기능) 그 배열 구조는 그대로 유지하고
// Stitch의 필드 스타일(rounded-full, 라벨-상단 배치, 2열 그리드)만 입혔다. 選考結果/
// リマインダー는 현재 스키마에 대응하는 칼럼이 없어 로컬 상태로만 두고 저장하지 않는다
// (Stitch에 있지만 기능이 없는 요소 = UI만 구현). 形式은 handleFormatChange 참고 —
// events.location/online_url로 이미 저장되지만 일정이 정확히 1개일 때만 반영한다.
export default function EmailAnalysisReview({
  analysis,
  existingCompany,
  onBack,
  onDone,
  footerContainer,
}: EmailAnalysisReviewProps) {
  const t = useT();
  const { showToast } = useToast();
  const { addCompany } = useCompanies();
  const { steps, addStep, refresh: refreshSteps } = useApplicationSteps();
  const { events: existingEvents, addEvent } = useEvents();
  const { contacts: existingContacts, addContact } = useCompanyContacts();
  const { addNote } = useCompanyNotes();

  const [companyValues, setCompanyValues] = useState<CompanyFormValues>(() => ({
    ...createEmptyCompanyFormValues(),
    name: analysis.companyName ?? "",
  }));
  const [stepName, setStepName] = useState(analysis.stepName ?? "");
  const [events, setEvents] = useState<EventFormValues[]>(() =>
    analysis.events.map(extractedEventToFormValues)
  );
  const [contacts, setContacts] = useState<ContactFormValues[]>(() =>
    analysis.contacts.map((contact) => ({
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      role: contact.role ?? "",
      memo: "",
    }))
  );
  const [memo, setMemo] = useState(analysis.memo ?? "");

  // 選考結果: application_steps.step_status(진행 여부만 표현)에도, companies.overall_status
  // (기업 전체의 최종 결과)에도 "이 전형 하나의 합격/불합격"을 표현할 필드가 없어(중간 전형
  // 합격을 overall_status="offer"로 매핑하면 의미가 왜곡된다), 대응하는 스키마가 생기기
  // 전까지는 저장하지 않는다(UI만 존재).
  const [resultOption, setResultOption] = useState<(typeof RESULT_OPTION_KEYS)[number]>(
    "inProgress"
  );
  const [formatOption, setFormatOption] = useState<(typeof FORMAT_OPTION_KEYS)[number]>("online");
  const [reminderOption, setReminderOption] =
    useState<(typeof REMINDER_OPTION_KEYS)[number]>("min15");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 부분 실패 후 재시도 시 이미 저장된 만큼은 다시 만들지 않기 위한 최소 상태.
  // existingCompany가 있는 흐름은 애초에 새 기업을 만들지 않으므로 영향받지 않는다.
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [savedEventCount, setSavedEventCount] = useState(0);
  const [savedContactCount, setSavedContactCount] = useState(0);

  // 표시는 항상 locale 번역(getStepDisplayName)을 쓰되, handleRegister의 매칭 로직이
  // 원본 name 또는 stepKey 기준 번역 문자열 어느 쪽으로 클릭/입력해도 올바른 기존 단계를
  // 찾아내므로, 여기서는 번역된 라벨을 그대로 클릭 값으로 써도 안전하다.
  const stepNameSuggestions = useMemo(() => {
    if (existingCompany) {
      return steps
        .filter((step) => step.companyId === existingCompany.id)
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((step) => getStepDisplayName(step, t));
    }
    return DEFAULT_STEP_KEYS.map((key) => t(`applicationSteps.default.${key}`));
  }, [existingCompany, steps, t]);

  function updateEvent(index: number, patch: Partial<EventFormValues>) {
    setEvents((prev) => prev.map((event, i) => (i === index ? { ...event, ...patch } : event)));
  }

  function removeEvent(index: number) {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  }

  function updateContact(index: number, patch: Partial<ContactFormValues>) {
    setContacts((prev) => prev.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)));
  }

  // 形式: events.location/online_url로 이미 저장 가능하지만, 이 선택지는 화면 전체에 1개뿐이라
  // 일정이 여러 개면 어느 일정에 적용할지 정할 수 없다. 일정이 정확히 1개일 때만, 선택한
  // 형식에 맞지 않는 반대쪽 필드(온라인 선택 시 場所, 대면 선택 시 URL)를 비워
  // 실제 저장되는 데이터가 선택값과 일치하게 한다. 일정이 0개나 2개 이상이면 아무 것도
  // 바꾸지 않는다(어느 일정을 바꿔야 할지 알 수 없으므로).
  function handleFormatChange(next: (typeof FORMAT_OPTION_KEYS)[number]) {
    setFormatOption(next);
    if (events.length !== 1) return;
    if (next === "online") updateEvent(0, { location: "" });
    else if (next === "offline") updateEvent(0, { onlineUrl: "" });
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleRegister() {
    if (!existingCompany && !companyValues.name.trim()) {
      setSaveError(t("companies.form.nameRequired"));
      return;
    }

    setSaving(true);
    setSaveError(null);

    let companyId: string;
    let candidateSteps = existingCompany
      ? steps.filter((step) => step.companyId === existingCompany.id)
      : [];

    if (existingCompany) {
      companyId = existingCompany.id;
    } else if (createdCompanyId) {
      // 이전 시도(이후 단계에서 실패해 재시도하는 경우)에서 이미 만들어진 기업을 그대로
      // 재사용한다 — addCompany를 다시 호출하면 같은 이름의 기업이 중복 생성된다.
      companyId = createdCompanyId;
      const freshSteps = await refreshSteps();
      candidateSteps = freshSteps.filter((step) => step.companyId === companyId);
    } else {
      const created = await addCompany(companyValues);
      if (!created) {
        // Context가 반환하는 원본 에러(예: Supabase 메시지)를 그대로 노출하지 않고
        // 고정된 안내 문구만 보여준다.
        setSaveError(t("aiEmail.review.companySaveFailed"));
        setSaving(false);
        return;
      }
      companyId = created.id;
      setCreatedCompanyId(created.id);
      // 기업 생성 시 DB 트리거가 기본 8개 전형을 자동 생성하므로, 최신 목록을 다시 받아온다.
      const freshSteps = await refreshSteps();
      candidateSteps = freshSteps.filter((step) => step.companyId === companyId);
    }

    let stepId: string | null = null;
    const trimmedStepName = stepName.trim();

    if (trimmedStepName) {
      // 원본 name과의 완전 일치(예: AI가 추출한 기본 전형 한국어 원문, 사용자 커스텀 전형)를
      // 우선 확인하고, 기본 전형(stepKey 존재)이면 현재 locale 번역 문자열과도 비교한다.
      // stepName 입력값이 어떤 언어로 들어와도(추천 pill 클릭/직접 입력 모두) 같은 기본
      // 전형이면 새로 만들지 않고 항상 같은 행을 재사용하게 하기 위함이다.
      const matched = candidateSteps.find(
        (step) =>
          step.name === trimmedStepName ||
          (step.stepKey && getStepDisplayName(step, t) === trimmedStepName)
      );
      if (matched) {
        stepId = matched.id;
      } else {
        // addStep()의 기본 order 계산은 Context 클로저의 steps를 참조하는데, 방금 생성한
        // 신규 기업은 그 steps에 아직 반영되지 않아 order가 1(엔트리와 충돌)로 잘못 계산될
        // 수 있다. 직전에 refreshSteps()로 받은 candidateSteps(최신 목록) 기준으로 직접
        // 계산해 넘겨 항상 맨 끝에 추가되게 한다.
        const nextOrder =
          candidateSteps.length === 0
            ? 1
            : Math.max(...candidateSteps.map((step) => step.stepOrder)) + 1;
        const createdStep = await addStep(companyId, trimmedStepName, nextOrder);
        if (!createdStep) {
          setSaveError(t("aiEmail.review.stepSaveFailed"));
          setSaving(false);
          return;
        }
        stepId = createdStep.id;
      }
    } else {
      stepId = [...candidateSteps].sort((a, b) => a.stepOrder - b.stepOrder)[0]?.id ?? null;
    }

    const eventsToSave = events.filter((event) => event.title.trim());

    if (eventsToSave.length > 0 && !stepId) {
      setSaveError(t("aiEmail.review.stepRequiredForEvents"));
      setSaving(false);
      return;
    }

    // savedEventCount부터 재개해, 이전 시도에서 이미 저장에 성공한 일정은 다시 만들지 않는다.
    // 같은 메일을 같은 기업에 다시 저장하는 경우(전형/타입/제목/시각이 기존 일정과 완전히
    // 같은 경우)도 중복 생성하지 않도록, 저장 전에 기존 일정과 정확히 일치하는지 확인한다.
    // 하나라도 다르면(예: AI가 제목을 조금 다르게 뽑은 경우) 별개의 새 일정으로 저장한다.
    for (let i = savedEventCount; i < eventsToSave.length; i++) {
      const toSave = eventsToSave[i];
      const toSaveTimeIso = formEventTimeIso(toSave);
      const alreadyExists = existingEvents.some((existing) => {
        if (existing.companyId !== companyId) return false;
        if (existing.applicationStepId !== stepId) return false;
        if (existing.eventType !== toSave.eventType) return false;
        if (existing.title.trim() !== toSave.title.trim()) return false;
        // existing 쪽 시각은 DB에서 "+00:00" 형식으로 오고 toSaveTimeIso는
        // Date.toISOString()이라 "Z" 형식이라, 같은 시각이어도 문자열이 달라 항상
        // false가 되는 문제가 있었다. 양쪽 다 toISOString()으로 정규화해 비교한다.
        const existingRaw = existing.eventType === "schedule" ? existing.startsAt : existing.dueAt;
        const existingTimeIso = existingRaw ? new Date(existingRaw).toISOString() : null;
        return existingTimeIso === toSaveTimeIso;
      });

      if (!alreadyExists) {
        const ok = await addEvent(companyId, stepId!, toSave);
        if (!ok) {
          setSaveError(t("aiEmail.review.eventSaveFailed"));
          setSaving(false);
          return;
        }
      }
      setSavedEventCount(i + 1);
    }

    const contactsToSave = contacts.filter((contact) => contact.name.trim());

    // 담당자도 동일하게 savedContactCount부터 재개하며, email이 있으면 email(trim+소문자)
    // 기준으로, 없으면 name 기준으로 기존 담당자와 중복인지 확인한다.
    for (let i = savedContactCount; i < contactsToSave.length; i++) {
      const toSave = contactsToSave[i];
      const trimmedEmail = toSave.email.trim().toLowerCase();
      const alreadyExists = existingContacts.some((existing) => {
        if (existing.companyId !== companyId) return false;
        return trimmedEmail
          ? existing.email.trim().toLowerCase() === trimmedEmail
          : existing.name.trim() === toSave.name.trim();
      });

      if (!alreadyExists) {
        const ok = await addContact(companyId, toSave);
        if (!ok) {
          setSaveError(t("aiEmail.review.contactSaveFailed"));
          setSaving(false);
          return;
        }
      }
      setSavedContactCount(i + 1);
    }

    if (memo.trim()) {
      const ok = await addNote(companyId, { title: "", content: memo });
      if (!ok) {
        setSaveError(t("aiEmail.review.noteSaveFailed"));
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    // 여기까지 도달했다는 것은 위의 모든 저장 단계(기업/전형/일정/담당자/메모)가
    // 하나도 실패하지 않고 통과했다는 뜻이다(각 단계는 실패 시 위에서 이미 return함).
    const finalName = existingCompany ? existingCompany.name : companyValues.name;
    showToast(t("aiEmail.review.saveSuccessToast", { name: finalName }));
    onDone(companyId, finalName);
  }

  const footer = (
    <>
      <button
        type="button"
        onClick={onBack}
        disabled={saving}
        className="flex-1 rounded-full border border-stitch-border py-4 text-[14px] font-[500] text-stitch-ink transition-all hover:bg-stitch-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("aiEmail.review.back")}
      </button>
      <button
        type="button"
        onClick={handleRegister}
        disabled={saving}
        className="flex-[2] rounded-full bg-primary-navy py-4 text-[14px] font-[500] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? t("aiEmail.review.submitting") : t("aiEmail.review.submit")}
      </button>
    </>
  );

  return (
    <div className={footerContainer ? "" : "flex h-full flex-col"}>
      <h3 className="mb-8 text-[24px] font-[500] tracking-tight text-stitch-ink">
        {t("aiEmail.review.title")}
      </h3>

      <div className={footerContainer ? "space-y-8" : "flex-1 space-y-8"}>
        <div className="rounded-stitch-2xl bg-stitch-bg px-6 py-3">
          <p className="flex items-center gap-2 text-[12px] text-secondary">
            <MaterialIcon name="info" size={16} />
            {existingCompany
              ? t("aiEmail.review.addingToExistingBanner")
              : t("aiEmail.review.newCompanyBanner")}
          </p>
        </div>

        {existingCompany ? (
          <Field label={t("aiEmail.review.companyNameLabel")}>
            <input
              type="text"
              value={existingCompany.name}
              disabled
              className={fieldInputClass + " cursor-not-allowed opacity-70"}
            />
          </Field>
        ) : (
          <div className="space-y-4">
            <Field label={t("companies.form.name")}>
              <input
                type="text"
                value={companyValues.name}
                onChange={(e) => setCompanyValues({ ...companyValues, name: e.target.value })}
                className={fieldInputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("companies.form.status")}>
                <select
                  value={companyValues.overallStatus}
                  onChange={(e) =>
                    setCompanyValues({
                      ...companyValues,
                      overallStatus: e.target.value as OverallStatus,
                    })
                  }
                  className={fieldInputClass + " appearance-none"}
                >
                  {OVERALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(STATUS_LABEL_KEYS[status])}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("companies.form.priorityLabel")}>
                <select
                  value={companyValues.priority}
                  onChange={(e) =>
                    setCompanyValues({ ...companyValues, priority: e.target.value as Priority })
                  }
                  className={fieldInputClass + " appearance-none"}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {t(`companies.list.priority.${priority}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Field label={t("aiEmail.review.stepLabel")}>
            <input
              type="text"
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder={t("aiEmail.review.stepPlaceholder")}
              className={fieldInputClass}
            />
          </Field>
          {stepNameSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1 pt-1">
              {stepNameSuggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setStepName(name)}
                  className="rounded-full border border-stitch-border px-3 py-1 text-[11px] text-secondary transition-colors hover:border-primary-navy/40 hover:text-primary-navy"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* docs/stitch/AI Drawer/jobcal_dashboard_ai_drawer_step_3_sophisticated_refresh의
            필드들. 選考結果/リマインダー는 대응하는 컬럼이 없어 로컬 상태로만 두고
            handleRegister에는 전달하지 않는다(UI만 구현). 形式은 handleFormatChange를 통해
            일정이 정확히 1개일 때만 그 일정의 location/onlineUrl에 반영된다. */}
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("aiEmail.review.resultLabel")}>
            <select
              value={resultOption}
              onChange={(e) => setResultOption(e.target.value as typeof resultOption)}
              className={fieldInputClass + " appearance-none"}
            >
              {RESULT_OPTION_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`aiEmail.review.resultOptions.${key}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("aiEmail.review.formatLabel")}>
            <select
              value={formatOption}
              onChange={(e) => handleFormatChange(e.target.value as typeof formatOption)}
              className={fieldInputClass + " appearance-none"}
            >
              {FORMAT_OPTION_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`aiEmail.review.formatOptions.${key}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t("aiEmail.review.reminderLabel")}>
          <select
            value={reminderOption}
            onChange={(e) => setReminderOption(e.target.value as typeof reminderOption)}
            className={fieldInputClass + " appearance-none"}
          >
            {REMINDER_OPTION_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`aiEmail.review.reminderOptions.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-[13px] font-[500] text-stitch-ink">
              {t("companies.steps.eventsHeading")}
            </h4>
            <button
              type="button"
              onClick={() => setEvents((prev) => [...prev, createEmptyEventFormValues()])}
              className="text-[12px] font-[500] text-primary-navy hover:underline"
            >
              {t("companies.steps.addEvent")}
            </button>
          </div>

          {events.length === 0 ? (
            <p className="rounded-stitch-2xl border border-dashed border-stitch-border py-6 text-center text-[12px] text-secondary">
              {t("aiEmail.review.noEvents")}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {events.map((event, index) => {
                const isSchedule = event.eventType === "schedule";
                const isDeadlineOrResult =
                  event.eventType === "deadline" || event.eventType === "result_announcement";

                return (
                  <div
                    key={index}
                    className="space-y-4 rounded-stitch-2xl border border-stitch-border bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Field label={t("aiEmail.review.typeLabel")}>
                          <select
                            value={event.eventType}
                            onChange={(e) =>
                              updateEvent(index, { eventType: e.target.value as EventType })
                            }
                            className={fieldInputClass + " appearance-none"}
                          >
                            {EVENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {t(EVENT_TYPE_LABEL_KEYS[type])}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEvent(index)}
                        className="mt-8 shrink-0 text-[11px] text-secondary hover:text-error hover:underline"
                      >
                        {t("common.delete")}
                      </button>
                    </div>

                    <Field label={t("companies.events.titleLabel")}>
                      <input
                        type="text"
                        value={event.title}
                        onChange={(e) => updateEvent(index, { title: e.target.value })}
                        className={fieldInputClass}
                      />
                    </Field>

                    {isSchedule && (
                      // datetime-local 입력은 네이티브 위젯 폭이 고정적이라 Drawer 폭(440px)에서
                      // grid-cols-2로 나란히 두면 값이 잘려 보인다. 세로로 쌓는다.
                      <div className="flex flex-col gap-4">
                        <Field label={t("companies.events.startsAt")}>
                          <input
                            type="datetime-local"
                            value={event.startsAt}
                            onChange={(e) => updateEvent(index, { startsAt: e.target.value })}
                            className={fieldInputClass}
                          />
                        </Field>
                        <Field
                          label={`${t("companies.events.endsAt")} ${t("common.optional")}`}
                        >
                          <input
                            type="datetime-local"
                            value={event.endsAt}
                            onChange={(e) => updateEvent(index, { endsAt: e.target.value })}
                            className={fieldInputClass}
                          />
                        </Field>
                      </div>
                    )}

                    {isDeadlineOrResult && (
                      <Field
                        label={
                          event.eventType === "deadline"
                            ? t("companies.events.dueAtDeadline")
                            : t("companies.events.dueAtResult")
                        }
                      >
                        <input
                          type="datetime-local"
                          value={event.dueAt}
                          onChange={(e) => updateEvent(index, { dueAt: e.target.value })}
                          className={fieldInputClass}
                        />
                      </Field>
                    )}

                    <Field
                      label={`${isSchedule ? t("companies.events.onlineLink") : t("aiEmail.review.urlLabel")} ${t("common.optional")}`}
                    >
                      <input
                        type="text"
                        value={event.onlineUrl}
                        onChange={(e) => updateEvent(index, { onlineUrl: e.target.value })}
                        className={fieldInputClass}
                      />
                    </Field>

                    <Field label={`${t("aiEmail.review.locationLabel")} ${t("common.optional")}`}>
                      <input
                        type="text"
                        value={event.location}
                        onChange={(e) => updateEvent(index, { location: e.target.value })}
                        className={fieldInputClass}
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-[13px] font-[500] text-stitch-ink">
              {t("companies.contacts.heading")}
            </h4>
            <button
              type="button"
              onClick={() => setContacts((prev) => [...prev, createEmptyContactFormValues()])}
              className="text-[12px] font-[500] text-primary-navy hover:underline"
            >
              {t("companies.contacts.addButton")}
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="rounded-stitch-2xl border border-dashed border-stitch-border py-6 text-center text-[12px] text-secondary">
              {t("aiEmail.review.noContacts")}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {contacts.map((contact, index) => (
                <div
                  key={index}
                  className="space-y-4 rounded-stitch-2xl border border-stitch-border bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Field label={t("companies.contacts.name")}>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => updateContact(index, { name: e.target.value })}
                          placeholder={t("aiEmail.review.assigneePlaceholder")}
                          className={fieldInputClass}
                        />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="mt-8 shrink-0 text-[11px] text-secondary hover:text-error hover:underline"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={`${t("companies.contacts.email")} ${t("common.optional")}`}>
                      <input
                        type="text"
                        value={contact.email}
                        onChange={(e) => updateContact(index, { email: e.target.value })}
                        className={fieldInputClass}
                      />
                    </Field>
                    <Field label={`${t("companies.contacts.phone")} ${t("common.optional")}`}>
                      <input
                        type="text"
                        value={contact.phone}
                        onChange={(e) => updateContact(index, { phone: e.target.value })}
                        className={fieldInputClass}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <Field label={t("aiEmail.review.memoLabel")}>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            className="min-h-[100px] w-full resize-none rounded-stitch-2xl border border-stitch-border bg-white p-4 text-[14px] text-stitch-ink outline-none transition-all focus:border-primary-navy/30 focus:bg-stitch-bg"
          />
        </Field>

        {saveError && (
          <p className="rounded-stitch-2xl border border-error/40 bg-error/10 px-4 py-3 text-[13px] text-error">
            {saveError}
          </p>
        )}
      </div>

      {footerContainer ? (
        // footerContainer가 이미 "flex gap-3" 행이므로 또 감싸지 않는다(중첩 시 안쪽 div가
        // flex-grow 없이 내용 크기로만 축소되어 버튼이 좁아지는 문제가 있었다).
        createPortal(footer, footerContainer)
      ) : (
        <div className="mt-auto flex gap-3 pt-8">{footer}</div>
      )}
    </div>
  );
}
