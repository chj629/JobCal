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
import { DEFAULT_STEP_NAMES } from "@/lib/applicationSteps";
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
  const { addCompany } = useCompanies();
  const { steps, addStep, refresh: refreshSteps } = useApplicationSteps();
  const { addEvent } = useEvents();
  const { addContact } = useCompanyContacts();
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

  const stepNameSuggestions = useMemo(() => {
    if (existingCompany) {
      return steps
        .filter((step) => step.companyId === existingCompany.id)
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((step) => step.name);
    }
    return DEFAULT_STEP_NAMES;
  }, [existingCompany, steps]);

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
      // 기업 생성 시 DB 트리거가 기본 8개 전형을 자동 생성하므로, 최신 목록을 다시 받아온다.
      const freshSteps = await refreshSteps();
      candidateSteps = freshSteps.filter((step) => step.companyId === companyId);
    }

    let stepId: string | null = null;
    const trimmedStepName = stepName.trim();

    if (trimmedStepName) {
      const matched = candidateSteps.find((step) => step.name === trimmedStepName);
      if (matched) {
        stepId = matched.id;
      } else {
        const createdStep = await addStep(companyId, trimmedStepName);
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

    for (const eventValues of eventsToSave) {
      const ok = await addEvent(companyId, stepId!, eventValues);
      if (!ok) {
        setSaveError(t("aiEmail.review.eventSaveFailed"));
        setSaving(false);
        return;
      }
    }

    const contactsToSave = contacts.filter((contact) => contact.name.trim());

    for (const contactValues of contactsToSave) {
      const ok = await addContact(companyId, contactValues);
      if (!ok) {
        setSaveError(t("aiEmail.review.contactSaveFailed"));
        setSaving(false);
        return;
      }
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
