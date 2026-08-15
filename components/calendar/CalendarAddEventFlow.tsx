"use client";

import { useState, type FormEvent } from "react";
import type { Company } from "@/lib/companies";
import { getCurrentStep, getStepDisplayName, type ApplicationStep } from "@/lib/applicationSteps";
import { createEmptyEventFormValues, type EventFormValues } from "@/lib/events";
import { useT } from "@/lib/locale-context";
import Modal from "@/components/ui/Modal";
import MaterialIcon from "@/components/ui/MaterialIcon";
import EventForm from "@/components/companies/EventForm";

interface CalendarAddEventFlowProps {
  companies: Company[];
  steps: ApplicationStep[];
  onCancel: () => void;
  onSubmit: (companyId: string, stepId: string, values: EventFormValues) => void | Promise<void>;
}

// components/companies/EventForm.tsx와 동일한 로컬 pill 스타일. EventForm 자체는 건드리지
// 않고(Company Detail 쪽 회귀 방지) 이 화면 전용으로만 재사용한다.
const FIELD_INPUT_CLASS =
  "w-full rounded-full border border-stitch-border bg-[#f8f9ff] px-5 py-2.5 text-[14px] text-foreground outline-none transition-all focus:border-primary-navy focus:ring-1 focus:ring-primary-navy";

// Calendar에서 일정을 추가할 때만 필요한 "기업 선택 → 전형 선택" 앞단. 기존 EventForm/
// addEvent는 이미 companyId/applicationStepId를 알고 있는 화면(Company Detail의
// CompanySchedulePanel)에서만 쓰였기 때문에, Calendar에서 처음부터 시작할 때 필요한 이
// 선택 단계만 새로 만든다. 둘 다 고르면 기존 EventForm을 그대로 렌더링하고 onSubmit은
// 상위(Calendar 페이지)가 건넨 addEvent 호출로 그대로 넘긴다 — 폼 필드/검증/저장 로직은
// 전혀 새로 만들지 않는다.
export default function CalendarAddEventFlow({
  companies,
  steps,
  onCancel,
  onSubmit,
}: CalendarAddEventFlowProps) {
  const t = useT();
  const [companyId, setCompanyId] = useState("");
  const [stepId, setStepId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const companySteps = steps
    .filter((step) => step.companyId === companyId)
    .sort((a, b) => a.stepOrder - b.stepOrder);

  function handleSelectCompany(id: string) {
    setCompanyId(id);
    const nextCompanySteps = steps
      .filter((step) => step.companyId === id)
      .sort((a, b) => a.stepOrder - b.stepOrder);
    // 전형 기본값은 그 기업의 현재 전형(getCurrentStep) — 다른 전형도 select로 바꿀 수 있다.
    const current = getCurrentStep(nextCompanySteps);
    setStepId(current?.id ?? nextCompanySteps[0]?.id ?? "");
  }

  function handleNext(event: FormEvent) {
    event.preventDefault();
    if (!companyId || !stepId) return;
    setShowForm(true);
  }

  if (showForm) {
    return (
      <EventForm
        title={t("calendar.addEvent.title")}
        initialValues={createEmptyEventFormValues()}
        onCancel={onCancel}
        onSubmit={(values) => onSubmit(companyId, stepId, values)}
      />
    );
  }

  return (
    <Modal
      title={t("calendar.addEvent.title")}
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
            form="calendar-add-event-picker"
            disabled={!companyId || !stepId}
            className="rounded-full bg-primary-navy px-8 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("common.next")}
          </button>
        </>
      }
    >
      <form id="calendar-add-event-picker" onSubmit={handleNext} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="calendar-add-event-company"
            className="px-1 text-[12px] font-[500] text-foreground"
          >
            {t("calendar.addEvent.companyLabel")}
          </label>
          <div className="relative">
            <select
              id="calendar-add-event-company"
              value={companyId}
              onChange={(e) => handleSelectCompany(e.target.value)}
              className={FIELD_INPUT_CLASS + " appearance-none pr-10"}
            >
              <option value="" disabled>
                {t("calendar.addEvent.companyPlaceholder")}
              </option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <MaterialIcon
              name="expand_more"
              size={18}
              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-secondary"
            />
          </div>
        </div>

        {companyId && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="calendar-add-event-step"
              className="px-1 text-[12px] font-[500] text-foreground"
            >
              {t("calendar.addEvent.stepLabel")}
            </label>
            <div className="relative">
              <select
                id="calendar-add-event-step"
                value={stepId}
                onChange={(e) => setStepId(e.target.value)}
                className={FIELD_INPUT_CLASS + " appearance-none pr-10"}
              >
                {companySteps.map((step) => (
                  <option key={step.id} value={step.id}>
                    {getStepDisplayName(step, t)}
                  </option>
                ))}
              </select>
              <MaterialIcon
                name="expand_more"
                size={18}
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-secondary"
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
