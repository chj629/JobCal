"use client";

import { useMemo, useState } from "react";
import { Calendar, User } from "lucide-react";
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
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface EmailAnalysisReviewProps {
  analysis: EmailAnalysisResult;
  existingCompany: Company | null;
  onBack: () => void;
  onDone: (companyId: string) => void;
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

export default function EmailAnalysisReview({
  analysis,
  existingCompany,
  onBack,
  onDone,
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
    showToast(
      t("aiEmail.review.saveSuccessToast", {
        name: existingCompany ? existingCompany.name : companyValues.name,
      })
    );
    onDone(companyId);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[20px] font-semibold text-foreground">{t("aiEmail.review.title")}</h1>
        <p className="mt-1 text-sm text-secondary">{t("aiEmail.review.description")}</p>
      </div>

      <section className="rounded-[10px] border border-border bg-card p-6">
        <h2 className="mb-4 text-[16px] font-semibold text-foreground">
          {t("aiEmail.review.companySection")}
        </h2>

        {existingCompany ? (
          <p className="text-sm text-foreground">
            <span className="font-medium">{existingCompany.name}</span>{" "}
            <span className="text-secondary">{t("aiEmail.review.addingToExistingSuffix")}</span>
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <Input
              label={t("companies.form.name")}
              type="text"
              value={companyValues.name}
              onChange={(e) => setCompanyValues({ ...companyValues, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label={t("companies.form.status")}
                value={companyValues.overallStatus}
                onChange={(e) =>
                  setCompanyValues({
                    ...companyValues,
                    overallStatus: e.target.value as OverallStatus,
                  })
                }
              >
                {OVERALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(STATUS_LABEL_KEYS[status])}
                  </option>
                ))}
              </Select>
              <Select
                label={t("companies.form.priorityLabel")}
                value={companyValues.priority}
                onChange={(e) =>
                  setCompanyValues({ ...companyValues, priority: e.target.value as Priority })
                }
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {t(`companies.list.priority.${priority}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[10px] border border-border bg-card p-6">
        <h2 className="mb-4 text-[16px] font-semibold text-foreground">
          {t("aiEmail.review.stepSection")}
        </h2>
        <Input
          type="text"
          value={stepName}
          onChange={(e) => setStepName(e.target.value)}
          placeholder={t("aiEmail.review.stepPlaceholder")}
        />
        {stepNameSuggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {stepNameSuggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setStepName(name)}
                className="rounded-full border border-border px-3 py-1 text-xs text-secondary hover:border-primary hover:text-primary"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[10px] border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-foreground">
            {t("companies.steps.eventsHeading")}
          </h2>
          <button
            type="button"
            onClick={() => setEvents((prev) => [...prev, createEmptyEventFormValues()])}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("companies.steps.addEvent")}
          </button>
        </div>

        {events.length === 0 ? (
          <EmptyState icon={Calendar} title={t("aiEmail.review.noEvents")} />
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((event, index) => {
              const isSchedule = event.eventType === "schedule";
              const isDeadlineOrResult =
                event.eventType === "deadline" || event.eventType === "result_announcement";

              return (
                <div key={index} className="rounded-[10px] border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Select
                      value={event.eventType}
                      onChange={(e) => updateEvent(index, { eventType: e.target.value as EventType })}
                      containerClassName="w-40"
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {t(EVENT_TYPE_LABEL_KEYS[type])}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => removeEvent(index)}
                      className="mt-2 text-xs text-secondary hover:text-error hover:underline"
                    >
                      {t("common.delete")}
                    </button>
                  </div>

                  <div className="mt-3">
                    <Input
                      label={t("companies.events.titleLabel")}
                      type="text"
                      value={event.title}
                      onChange={(e) => updateEvent(index, { title: e.target.value })}
                    />
                  </div>

                  {isSchedule && (
                    // datetime-local 입력은 네이티브 위젯 폭이 고정적이라 grid-cols-2로
                    // 나란히 두면 Drawer 폭(520px)에서 값이 잘려 보인다. 좁은 폭에서도
                    // 안전하게 세로로 쌓는다.
                    <div className="mt-3 flex flex-col gap-4">
                      <Input
                        label={t("companies.events.startsAt")}
                        type="datetime-local"
                        value={event.startsAt}
                        onChange={(e) => updateEvent(index, { startsAt: e.target.value })}
                      />
                      <Input
                        label={
                          <>
                            {t("companies.events.endsAt")}{" "}
                            <span className="text-secondary">{t("common.optional")}</span>
                          </>
                        }
                        type="datetime-local"
                        value={event.endsAt}
                        onChange={(e) => updateEvent(index, { endsAt: e.target.value })}
                      />
                    </div>
                  )}

                  {isDeadlineOrResult && (
                    <div className="mt-3">
                      <Input
                        label={
                          event.eventType === "deadline"
                            ? t("companies.events.dueAtDeadline")
                            : t("companies.events.dueAtResult")
                        }
                        type="datetime-local"
                        value={event.dueAt}
                        onChange={(e) => updateEvent(index, { dueAt: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="mt-3">
                    <Input
                      label={
                        <>
                          {isSchedule ? t("companies.events.onlineLink") : t("aiEmail.review.linkGeneric")}{" "}
                          <span className="text-secondary">{t("common.optional")}</span>
                        </>
                      }
                      type="text"
                      value={event.onlineUrl}
                      onChange={(e) => updateEvent(index, { onlineUrl: e.target.value })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-[10px] border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-foreground">
            {t("companies.contacts.heading")}
          </h2>
          <button
            type="button"
            onClick={() => setContacts((prev) => [...prev, createEmptyContactFormValues()])}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("companies.contacts.addButton")}
          </button>
        </div>

        {contacts.length === 0 ? (
          <EmptyState icon={User} title={t("aiEmail.review.noContacts")} />
        ) : (
          <div className="flex flex-col gap-4">
            {contacts.map((contact, index) => (
              <div key={index} className="rounded-[10px] border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Input
                      label={t("companies.contacts.name")}
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(index, { name: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="mt-6 shrink-0 text-xs text-secondary hover:text-error hover:underline"
                  >
                    {t("common.delete")}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Input
                    label={
                      <>
                        {t("companies.contacts.email")}{" "}
                        <span className="text-secondary">{t("common.optional")}</span>
                      </>
                    }
                    type="text"
                    value={contact.email}
                    onChange={(e) => updateContact(index, { email: e.target.value })}
                  />
                  <Input
                    label={
                      <>
                        {t("companies.contacts.phone")}{" "}
                        <span className="text-secondary">{t("common.optional")}</span>
                      </>
                    }
                    type="text"
                    value={contact.phone}
                    onChange={(e) => updateContact(index, { phone: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[10px] border border-border bg-card p-6">
        <h2 className="mb-4 text-[16px] font-semibold text-foreground">
          {t("companies.notes.heading")}
        </h2>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={4}
          className="w-full rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
        />
      </section>

      {saveError && (
        <p className="rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {saveError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onBack} disabled={saving}>
          {t("aiEmail.review.back")}
        </Button>
        <Button type="button" variant="primary" onClick={handleRegister} disabled={saving}>
          {saving ? t("aiEmail.review.submitting") : t("aiEmail.review.submit")}
        </Button>
      </div>
    </div>
  );
}
