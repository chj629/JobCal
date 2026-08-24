"use client";

import { useMemo, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { useEvents } from "@/lib/events-context";
import { useCompanyContacts } from "@/lib/company-contacts-context";
import { useCompanyNotes } from "@/lib/company-notes-context";
import {
  OVERALL_STATUSES,
  PRIORITIES,
  companyToFormValues,
  createEmptyCompanyFormValues,
  type Company,
  type CompanyFormValues,
  type OverallStatus,
  type Priority,
} from "@/lib/companies";
import {
  DEFAULT_STEP_KEYS,
  getStepDisplayName,
  matchDefaultStepKey,
  type StepStatus,
} from "@/lib/applicationSteps";
import {
  EVENT_TYPES,
  applyExplicitEventFormat,
  createEmptyEventFormValues,
  deriveEventFormat,
  eventTimeIso,
  isoToDatetimeLocal,
  mergeEventFormValues,
  type EventFormat,
  type EventFormValues,
  type EventType,
} from "@/lib/events";
import { createEmptyContactFormValues, type ContactFormValues } from "@/lib/companyContacts";
import type { EmailAnalysisResult, ExtractedEvent } from "@/lib/ai/emailAnalysis";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AiOnboardingStep3 from "@/components/AiOnboardingStep3";

interface EmailAnalysisReviewProps {
  analysis: EmailAnalysisResult;
  existingCompany: Company | null;
  onBack: () => void;
  onDone: (companyId: string, companyName: string) => void;
  // EmailPasteForm과 동일한 목적 — 제공되면 footer 버튼을 Drawer의 고정 footer로 portal.
  footerContainer?: HTMLDivElement | null;
  // AI onboarding Step 3(AiMailDrawer.tsx 전용). new-from-email 페이지는 이 prop들을
  // 넘기지 않으므로 항상 false/undefined로 동작해 기존 화면은 전혀 영향받지 않는다.
  showOnboardingStep3?: boolean;
  registerButtonRef?: RefObject<HTMLButtonElement | null>;
  onOnboardingStep3Dismiss?: () => void;
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
// Stitch의 필드 스타일(rounded-full, 라벨-상단 배치, 2열 그리드)만 입혔다. 選考結果는
// handleRegister에서 stepId가 명확히 매칭된 경우에만 application_steps/companies에 반영한다
// (아래 handleRegister 근처 주석 참고). リマインダー는 여전히 대응하는 컬럼이 없어 로컬
// 상태로만 두고 저장하지 않는다(Stitch에 있지만 기능이 없는 요소 = UI만 구현). 形式은
// handleFormatChange 참고 — events.location/online_url로 이미 저장되지만 일정이 정확히
// 1개일 때만 반영한다.
export default function EmailAnalysisReview({
  analysis,
  existingCompany,
  onBack,
  onDone,
  footerContainer,
  showOnboardingStep3 = false,
  registerButtonRef,
  onOnboardingStep3Dismiss,
}: EmailAnalysisReviewProps) {
  const t = useT();
  const { showToast } = useToast();
  const { addCompany, updateCompany } = useCompanies();
  const { steps, addStep, updateStepStatus, refresh: refreshSteps } = useApplicationSteps();
  // updateEvent라는 이름은 이미 아래 로컬 함수(폼 배열의 index를 갱신)가 쓰고 있어, DB
  // 갱신용은 다른 이름으로 구분한다.
  const { events: existingEvents, addEvent, updateEvent: updateEventRecord } = useEvents();
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

  // 選考結果: handleRegister에서 stepId가 명확히 매칭된 경우에만 application_steps.step_status에
  // 반영한다(inProgress/passed/failed → 그대로 stepStatus, updateStepStatus의 캐스케이드 재사용).
  // withdrawn은 전형이 아니라 companies.overall_status="cancelled"로 저장하고, failed도 함께
  // overall_status="rejected"로 반영한다(Step3에서 고른 값을 명시적 의사로 본다). 마지막 전형
  // passed라고 임의로 offer 처리하지는 않는다.
  // 기본값은 lib/ai/emailAnalysis.ts가 프롬프트 + 결정적 후처리로 판단한 analysis.resultOption을
  // 그대로 쓴다(과거에는 항상 "inProgress"로 고정돼 있어 이메일에 合格/不合格이 명시돼 있어도
  // 반영되지 않았다). 이 select는 여전히 사용자가 직접 바꿀 수 있어 최종 확인/수정 지점은 그대로다.
  const [resultOption, setResultOption] = useState<(typeof RESULT_OPTION_KEYS)[number]>(
    analysis.resultOption
  );
  // AI가 뽑아낸 첫 일정의 location/online_url로부터 초기 표시값만 파생한다(온라인 우선,
  // lib/events.ts의 deriveEventFormat과 StepDetailPanel이 공유하는 규칙) — 이 시점엔 아직
  // 아무 것도 저장하지 않으므로 AI가 둘 다 추출했어도 그대로 보존된다.
  const [formatOption, setFormatOption] = useState<EventFormat>(() =>
    events.length === 1 ? deriveEventFormat(events[0]) : "undecided"
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 부분 실패 후 재시도 시 이미 저장된 만큼은 다시 만들지 않기 위한 최소 상태.
  // existingCompany가 있는 흐름은 애초에 새 기업을 만들지 않으므로 영향받지 않는다.
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [savedEventCount, setSavedEventCount] = useState(0);
  const [savedContactCount, setSavedContactCount] = useState(0);

  // waiting→in_progress로 먼 전형을 바로 등록하려 할 때, 그 앞에 아직 결과가 정해지지
  // 않은(waiting) 전형이 있으면 등록 직전에 사용자 확인을 받는다. 확인하면 앞 단계들을
  // 순서대로 passed 처리한 뒤 대상 전형을 in_progress로 설정하고(handleRegister 근처 주석
  // 참고, updateStepStatus의 기존 캐스케이드를 그대로 재사용), 취소하면 전형 상태는 전혀
  // 건드리지 않고 나머지 저장(일정/담당자/메모)만 이어간다.
  const [holeConfirm, setHoleConfirm] = useState<{
    companyId: string;
    stepId: string;
    stepDisplayName: string;
    waitingStepIds: string[];
    currentInProgressId: string | null;
  } | null>(null);

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
  // 형식에 해당하는 필드는 지금 값 그대로 유지하고 반대쪽만 비운다 — StepDetailPanel과
  // 같은 lib/events.ts의 applyExplicitEventFormat을 그대로 써서 두 화면의 규칙이 어긋나지
  // 않게 한다. 이 select의 onChange 자체가 이미 사용자의 명시적 선택이므로(같은 값으로는
  // 브라우저가 onChange를 쏘지 않는다) StepDetailPanel처럼 "만졌는지" 여부를 따로 추적할
  // 필요가 없다. 일정이 0개나 2개 이상이면 아무 것도 바꾸지 않는다(어느 일정을 바꿔야
  // 할지 알 수 없으므로) — 이 경우 원문 그대로(location/online_url 둘 다) 보존된다.
  function handleFormatChange(next: EventFormat) {
    setFormatOption(next);
    if (events.length !== 1) return;
    const current = events[0];
    const fieldValue = next === "online" ? current.onlineUrl : next === "offline" ? current.location : "";
    updateEvent(0, applyExplicitEventFormat(current, next, fieldValue));
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  // 대상 전형보다 step_order가 앞선 전형 중 실패/대기 상태가 있는지 Supabase에서 직접
  // 다시 조회해 확인한다(다른 곳과 동일한 이유로 로컬 steps 클로저를 신뢰하지 않는다).
  async function checkStepHole(companyId: string, targetStepId: string) {
    const freshSteps = await refreshSteps();
    const companySteps = freshSteps
      .filter((step) => step.companyId === companyId)
      .sort((a, b) => a.stepOrder - b.stepOrder);
    const target = companySteps.find((step) => step.id === targetStepId);
    if (!target) return null;
    const earlierSteps = companySteps.filter((step) => step.stepOrder < target.stepOrder);
    // updateStepStatus는 waiting인 전형을 곧바로 passed로 바꾸는 것을 막는다(전형 상태
    // 가드, lib/application-steps-context.tsx) — waiting 전형들을 그냥 순서대로 passed
    // 호출하면 첫 번째 호출부터 막힌다. 대신 지금 in_progress인 전형부터 시작해 passed를
    // 반복 호출하면, updateStepStatus의 기존 캐스케이드(다음 waiting을 in_progress로 자동
    // 승격)가 한 칸씩 밀어 올려 결국 대상 전형까지 자연스럽게 이어진다.
    const currentInProgress = companySteps.find((step) => step.stepStatus === "in_progress");
    return {
      target,
      failedIds: earlierSteps.filter((step) => step.stepStatus === "failed").map((step) => step.id),
      waitingIds: earlierSteps.filter((step) => step.stepStatus === "waiting").map((step) => step.id),
      currentInProgressId:
        currentInProgress && currentInProgress.stepOrder < target.stepOrder
          ? currentInProgress.id
          : null,
    };
  }

  // handleRegister의 전형 상태 반영 이후(기업 상태/일정/담당자/메모/완료 처리) 부분을 그대로
  // 옮긴 것 — holeConfirm 확인/취소 양쪽에서 재사용하기 위해 분리했을 뿐 로직은 바뀌지 않았다.
  async function finishAfterStepStatus(companyId: string, stepId: string | null) {
    // withdrawn은 전형 상태가 아니라 기업 전체 상태다. failed도 함께 overallStatus에
    // 반영한다 — 둘 다 Step3에서 사용자가 직접 고른 값이라 명시적 의사로 보고, Company
    // Detail의 "변경할까요?" 확인 UI는 여기서는 띄우지 않는다. 마지막 전형이 passed라고
    // 임의로 offer 처리하지는 않는다(메일만으로는 실제 내정 여부를 확신할 수 없다).
    if (resultOption === "failed" || resultOption === "withdrawn") {
      const baseValues = existingCompany ? companyToFormValues(existingCompany) : companyValues;
      const companyStatusOk = await updateCompany(companyId, {
        ...baseValues,
        overallStatus: resultOption === "failed" ? "rejected" : "cancelled",
      });
      if (!companyStatusOk) {
        setSaveError(t("aiEmail.review.companyStatusSaveFailed"));
        setSaving(false);
        return;
      }
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
    //
    // 전형/타입/제목이 같은데 기존 쪽만 날짜 미정(existingTimeIso === null)이고 이번에는
    // 날짜가 확인된 경우(toSaveTimeIso !== null)는 "완전히 같음"도 "완전히 다름"도 아니다 —
    // 같은 일정에 날짜가 뒤늦게 확정된 것으로 보고 새로 만들지 않고 그 이벤트를 채운다
    // (mergeEventFormValues로 기존 location/onlineUrl/memo도 이번 결과가 비어 있으면 보존).
    // 그 외 경우(둘 다 날짜 미정 → existingTimeIso와 toSaveTimeIso 둘 다 null이라 이미 위
    // "완전히 같음"에서 걸러짐, 또는 날짜가 서로 다름)는 기존 로직 그대로 새 일정으로 저장한다.
    for (let i = savedEventCount; i < eventsToSave.length; i++) {
      const toSave = eventsToSave[i];
      const toSaveTimeIso = formEventTimeIso(toSave);
      const sameSlot = existingEvents.find((existing) => {
        if (existing.companyId !== companyId) return false;
        if (existing.applicationStepId !== stepId) return false;
        if (existing.eventType !== toSave.eventType) return false;
        if (existing.title.trim() !== toSave.title.trim()) return false;
        return true;
      });
      const existingTimeIso = sameSlot ? eventTimeIso(sameSlot) : null;

      if (sameSlot && existingTimeIso === toSaveTimeIso) {
        // 완전히 동일한 일정(날짜까지 같거나, 둘 다 날짜 미정) — 아무 것도 하지 않는다.
      } else if (sameSlot && existingTimeIso === null && toSaveTimeIso !== null) {
        const ok = await updateEventRecord(sameSlot.id, mergeEventFormValues(sameSlot, toSave));
        if (!ok) {
          setSaveError(t("aiEmail.review.eventSaveFailed"));
          setSaving(false);
          return;
        }
      } else {
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
      // 먼저 stepName이 8개 기본 전형(step_key) 중 하나와 의미상 같은지 판정한다(ko/ja 번역,
      // 대소문자·공백 변형까지 흡수 — matchDefaultStepKey 참고). 매칭되면 현재 UI locale이나
      // 이 기업의 전형이 어떤 name으로 저장돼 있는지와 무관하게 stepKey만으로 기존 전형을
      // 찾는다 — 이메일이 어느 언어로 와도(AI가 어느 언어로 stepName을 반환해도) 같은 기본
      // 전형이면 항상 같은 행을 재사용하고 새로 만들지 않는다.
      // 기본 전형이 아니면(=사용자가 직접 만든 커스텀 전형) 기존 그대로 정확한 문자열 일치만
      // 확인한다 — 서로 다른 커스텀 전형을 임의로 합치지 않기 위함이다.
      const canonicalStepKey = matchDefaultStepKey(trimmedStepName);
      const matched = candidateSteps.find((step) =>
        canonicalStepKey
          ? step.stepKey === canonicalStepKey
          : step.name === trimmedStepName ||
            (step.stepKey && getStepDisplayName(step, t) === trimmedStepName)
      );
      if (matched) {
        stepId = matched.id;
      } else {
        // addStep()이 항상 Supabase에서 이 기업의 전형을 직접 다시 조회해 order/in_progress
        // 여부를 계산하므로, 방금 생성한 신규 기업이라 이 화면의 candidateSteps가 아직
        // 최신이 아니어도(또는 로컬 steps 클로저가 뒤처져 있어도) order가 충돌하지 않는다.
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

    // 選考結果 반영: trimmedStepName이 비어 있으면 stepId는 "첫 전형으로 추정"한 값이라
    // 명확한 매칭이 아니므로 건드리지 않는다. 상태 변경은 application-steps-context.tsx의
    // updateStepStatus(캐스케이드 포함)를 그대로 재사용하고 별도 로직을 두지 않는다.
    if (trimmedStepName && stepId && resultOption !== "withdrawn") {
      const newStepStatus: StepStatus =
        resultOption === "passed" ? "passed" : resultOption === "failed" ? "failed" : "in_progress";

      // in_progress로 먼 전형을 바로 지정하면 그 앞의 waiting 전형들이 영원히 결과가 정해지지
      // 않은 "구멍"으로 남을 수 있다(수동 Company Detail select는 항상 현재 전형만 조작
      // 가능해 이 문제가 나지 않는다 — AI Drawer만의 경로). 앞에 이미 failed인 전형이 있으면
      // AI가 임의로 통과 처리하지 않고 등록 자체를 중단하며, waiting인 전형만 있으면 먼저
      // 사용자에게 확인받는다(holeConfirm → confirmHole/cancelHole).
      if (newStepStatus === "in_progress") {
        const hole = await checkStepHole(companyId, stepId);
        if (hole) {
          if (hole.failedIds.length > 0) {
            setSaveError(t("aiEmail.review.blockedByFailedStep"));
            setSaving(false);
            return;
          }
          if (hole.waitingIds.length > 0) {
            setHoleConfirm({
              companyId,
              stepId,
              stepDisplayName: getStepDisplayName(hole.target, t),
              waitingStepIds: hole.waitingIds,
              currentInProgressId: hole.currentInProgressId,
            });
            setSaving(false);
            return;
          }
        }
      }

      const stepStatusOk = await updateStepStatus(stepId, newStepStatus);
      if (!stepStatusOk) {
        setSaveError(t("aiEmail.review.stepStatusSaveFailed"));
        setSaving(false);
        return;
      }
    }

    await finishAfterStepStatus(companyId, stepId);
  }

  // holeConfirm 확인: 대상 전형보다 앞선 waiting 전형들을 step_order 순서대로 passed 처리한다.
  // updateStepStatus 한 번이 "passed로 바뀔 때 order가 더 크면서 step_status가 waiting인
  // 가장 가까운 전형을 in_progress로 승격"까지 이미 처리하므로, 앞 단계를 순서대로 passed
  // 호출만 반복하면 별도 캐스케이드 없이도 자연스럽게 대상 전형까지 승격된다. 마지막에 대상
  // 전형을 다시 in_progress로 명시 설정해 정확히 그 전형에서 멈추게 한다(이미 승격되어
  // 있어도 멱등이라 안전하다).
  async function confirmHole() {
    if (!holeConfirm) return;
    const { companyId, stepId, waitingStepIds, currentInProgressId } = holeConfirm;
    setHoleConfirm(null);
    setSaving(true);

    // 지금 in_progress인 전형부터 시작해야 첫 passed 호출이 가드를 통과한다(checkStepHole
    // 주석 참고) — currentInProgressId가 없으면(이론상 거의 없음) waitingStepIds만으로
    // 시도하고, 그래도 막히면 아래에서 stepStatusSaveFailed로 안내한다.
    const passChain = currentInProgressId ? [currentInProgressId, ...waitingStepIds] : waitingStepIds;
    for (const idToPass of passChain) {
      const ok = await updateStepStatus(idToPass, "passed");
      if (!ok) {
        setSaveError(t("aiEmail.review.stepStatusSaveFailed"));
        setSaving(false);
        return;
      }
    }

    const stepStatusOk = await updateStepStatus(stepId, "in_progress");
    if (!stepStatusOk) {
      setSaveError(t("aiEmail.review.stepStatusSaveFailed"));
      setSaving(false);
      return;
    }

    await finishAfterStepStatus(companyId, stepId);
  }

  // 취소하면 전형 상태는 전혀 건드리지 않고(대상 전형은 등록 당시 상태 그대로 유지) 일정・
  // 담당자・메모 등 나머지 저장만 이어간다 — stepName을 비워 저장했을 때와 동일한 처리다.
  async function cancelHole() {
    if (!holeConfirm) return;
    const { companyId, stepId } = holeConfirm;
    setHoleConfirm(null);
    setSaving(true);
    await finishAfterStepStatus(companyId, stepId);
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
        ref={registerButtonRef}
        type="button"
        onClick={() => {
          // 실제 등록 로직은 그대로 실행하고, 그 same 클릭이 Step 3 튜토리얼의 종료
          // 조건이기도 하다 — 등록을 가로채거나 복제하지 않는다(EmailPasteForm.tsx의
          // "AIで分析" 버튼과 동일한 패턴). onOnboardingStep3Dismiss가 없으면(온보딩 중이
          // 아니거나 new-from-email 페이지면) 아무 일도 하지 않는다.
          handleRegister();
          onOnboardingStep3Dismiss?.();
        }}
        disabled={saving}
        className="flex-[2] inline-flex items-center justify-center gap-1.5 rounded-full bg-primary-navy py-4 text-[14px] font-[500] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving && <MaterialIcon name="progress_activity" size={16} className="animate-spin" />}
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
            필드들. 選考結果는 handleRegister에서 stepId/companyId에 반영된다(아래 참고).
            形式은 handleFormatChange를 통해 일정이 정확히 1개일 때만 그 일정의
            location/onlineUrl에 반영된다. リマインダー는 대응하는 컬럼/알림 로직이 없어
            선택해도 저장되지 않는 죽은 select였기 때문에 UI를 숨겼다(관련 state/상수/i18n
            키도 함께 정리) — 나중에 알림 기능이 생기면 이 자리에 select를 다시 붙이면 된다. */}
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

      {holeConfirm && (
        <ConfirmDialog
          open
          variant="primary"
          title={t("aiEmail.review.holeConfirmTitle", { stepName: holeConfirm.stepDisplayName })}
          description={t("aiEmail.review.holeConfirmDescription", {
            count: holeConfirm.waitingStepIds.length,
          })}
          confirmLabel={t("aiEmail.review.holeConfirmAccept")}
          cancelLabel={t("common.cancel")}
          onConfirm={confirmHole}
          onCancel={cancelHole}
        />
      )}

      {/* showOnboardingStep3가 아니라 onOnboardingStep3Dismiss/registerButtonRef 유무로
          렌더 여부를 결정한다 — EmailPasteForm.tsx의 AiOnboardingStep2와 같은 이유
          (showOnboardingStep3로 게이팅하면 그 값이 false가 되는 바로 그 렌더에서
          AiOnboardingStep3가 통째로 unmount되어, 내부 fade-out이 실행될 기회조차 없이
          사라져 버린다). */}
      {registerButtonRef && onOnboardingStep3Dismiss && (
        <AiOnboardingStep3
          active={showOnboardingStep3}
          targetRef={registerButtonRef}
          onDismiss={onOnboardingStep3Dismiss}
        />
      )}
    </div>
  );
}
