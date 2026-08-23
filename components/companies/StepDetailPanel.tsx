"use client";

import { useRef, useState } from "react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import {
  STEP_STATUSES,
  STEP_STATUS_LABEL_KEYS,
  getCurrentStep,
  getStepDisplayName,
  type StepStatus,
} from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import { createEmptyEventFormValues, eventToFormValues, getRepresentativeEvent } from "@/lib/events";
import { formatTimeOfDay } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface StepDetailPanelProps {
  companyId: string;
  selectedStepId: string | null;
  onClose: () => void;
}

type FormatChoice = "online" | "offline" | "undecided";

// 온라인 일정의 참가 링크 hostname으로 서비스를 간단히 판별해 라벨을 고른다("Teams リンク" 등).
// 매칭되지 않거나(URL 형식이 아닌 값 포함) 알 수 없는 서비스면 중립 라벨(default)로 폴백한다.
function getMeetingLinkKey(url: string): "teams" | "zoom" | "googleMeet" | "default" {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes("teams.microsoft.com")) return "teams";
    if (hostname.includes("zoom.us")) return "zoom";
    if (hostname.includes("meet.google.com")) return "googleMeet";
  } catch {
    // URL 파싱 실패 시 default로 폴백
  }
  return "default";
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "選考詳細" 섹션.
// Stitch는 항상 보이는 카드 하나로 "선택된 전형(없으면 현재 전형)"의 상태/일시/형식을
// 보여준다. 헤더는 전형명 자체이고 클릭하면 이름을 인라인 편집하며, 우측 휴지통 아이콘으로
// 삭제한다(점세개 메뉴는 제거 — 순서 이동은 데스크톱에서 StepTimeline의 드래그로 처리한다).
// 드래그는 터치 기기에서 동작하지 않아, 모바일(md 미만)에서만 이름 옆에 위/아래 이동
// 아이콘 버튼을 추가로 보여준다 — 새 reorder 로직 없이 StepTimeline의 드래그와 똑같이
// moveStep(id, "up"|"down")을 그대로 호출한다.
// 일시/형식은 이 전형에 연결된 이벤트 중 "대표 일정"(primaryEvent) 하나를 클릭 시 인라인으로
// 직접 편집하며, 별도 데이터를 두지 않고 events 테이블의 실제 값을 addEvent/updateEvent로
// 갱신한다. 대표 일정은 lib/events.ts의 getRepresentativeEvent()로 고른다 — 미래 이벤트가
// 있으면 그중 가장 가까운 것, 없으면 과거 이벤트 중 가장 최근 것을 대표로 삼는다(Dashboard/
// Companies 목록이 쓰는 getNextEvent()는 "미래만" 보여줘야 해서 과거 이벤트를 제외하지만,
// 이 패널은 이미 등록된 과거 일정도 未定으로 숨기지 않고 그대로 보여줘야 하므로 별도 함수를
// 쓴다). 한 전형에 이벤트가 2개 이상이면 대표 일정 1개만 여기서 편집하고, 나머지는 "그 외
// N개" 안내만 보여준 뒤 전체 관리는 CompanySchedulePanel("일정" 카드)로 유도한다. primaryEvent가
// 이미 있으면 형식만 바꿔도 즉시 updateEvent로 반영되지만,
// primaryEvent가 없는 상태에서 형식만 먼저 입력하면 아직 실제 일정이 아니므로(가짜 일시로
// 이벤트를 만들면 Calendar/Dashboard/Analytics에 없는 일정이 노출된다) DB에 쓰지 않고
// pendingFormat에만 잠시 담아둔다. 이후 일시를 입력해 이벤트를 생성하는 순간 그 값을
// 함께 반영한다(이벤트 생성 기준은 항상 "실제 일시 입력"으로 통일).
export default function StepDetailPanel({ companyId, selectedStepId }: StepDetailPanelProps) {
  const t = useT();
  const { steps, error: stepsError, deleteStep, renameStep, updateStepStatus, moveStep } =
    useApplicationSteps();
  const { events, addEvent, updateEvent, refresh: refreshEvents } = useEvents();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [dateTimeDraft, setDateTimeDraft] = useState("");
  // 종료시간은 시작 날짜와 조합해 endsAt으로 저장되므로 "HH:MM" 시간만 따로 들고 있는다.
  // showEndTime은 "종료시간 입력칸을 보여줄지"만 담당 — endTimeDraft가 비어 있어도
  // showEndTime이 true면 입력칸 자체는 계속 보인다(사용자가 아직 입력 중일 수 있음).
  const [endTimeDraft, setEndTimeDraft] = useState("");
  const [showEndTime, setShowEndTime] = useState(false);
  const [dateTimeError, setDateTimeError] = useState("");
  const [isEditingFormat, setIsEditingFormat] = useState(false);
  const [formatChoiceDraft, setFormatChoiceDraft] = useState<FormatChoice>("undecided");
  const [formatValueDraft, setFormatValueDraft] = useState("");
  // primaryEvent가 없는 상태에서 형식만 먼저 저장했을 때만 채워진다 — DB에는 아직 아무것도
  // 쓰지 않고, 일시를 입력해 이벤트가 만들어지는 순간 함께 반영한 뒤 비운다. stepId를
  // 함께 저장해두고 읽을 때 현재 선택된 전형과 다르면 무시한다 — 전형을 바꿔도 이전
  // 전형의 임시 값이 새 전형에 잘못 노출되지 않는다(effect로 초기화할 필요가 없다).
  const [pendingFormat, setPendingFormat] = useState<
    { stepId: string; choice: FormatChoice; value: string } | null
  >(null);
  // Escape로 닫을 때 언마운트가 유발하는 blur가 각 confirm 함수를 한 번 더 부르지 않도록 막는
  // 표시. 필드별로 독립적인 편집 상태라 각각 별도 ref로 둔다.
  const skipRenameBlurRef = useRef(false);
  const skipDateTimeBlurRef = useRef(false);
  const skipFormatBlurRef = useRef(false);
  // ×(종료시간 제거) 클릭 시 그 버튼 자신이 사라지므로, 미리 시작 시간 입력으로 포커스를
  // 되돌려 "그룹 밖으로 포커스가 나갔다"는 blur 오탐(조기 confirmDateTime 호출)을 막는다.
  const startDateTimeInputRef = useRef<HTMLInputElement | null>(null);

  const companySteps = steps
    .filter((step) => step.companyId === companyId)
    .sort((a, b) => a.stepOrder - b.stepOrder);
  const currentStep = getCurrentStep(companySteps);
  const step = companySteps.find((s) => s.id === selectedStepId) ?? currentStep;

  if (!step) return null;

  const stepIndex = companySteps.findIndex((s) => s.id === step.id);
  const isFirstStep = stepIndex <= 0;
  const isLastStep = stepIndex === companySteps.length - 1;
  // 순서 변경(드래그/위아래 이동) 자체는 step_status와 무관하게 항상 허용한다 — passed/
  // failed/in_progress 전형도 자유롭게 옮길 수 있다. step_status는 순서 변경으로 자동
  // 변경되지 않으며(updateStepStatus의 캐스케이드만이 여전히 유일한 변경 경로), 대신
  // "현재 진행 단계보다 뒤에 있는 waiting 전형만 상태 select를 막는다"는 규칙으로
  // 아래 isFutureWaitingStep이 그 정합성을 보장한다.
  const isFutureWaitingStep =
    step.stepStatus === "waiting" && !!currentStep && step.stepOrder > currentStep.stepOrder;

  const activePendingFormat = pendingFormat && pendingFormat.stepId === step.id ? pendingFormat : null;

  const stepEvents = events.filter((event) => event.applicationStepId === step.id);
  const primaryEvent = getRepresentativeEvent(stepEvents);
  const primaryEventAt = primaryEvent ? (primaryEvent.startsAt ?? primaryEvent.dueAt) : null;
  const otherEventsCount = stepEvents.length - (primaryEvent ? 1 : 0);
  // deadline/result_announcement는 dueAt 하나만 쓰고 endsAt 자체가 없는 타입이라(lib/events.ts
  // eventFormValuesToRow 참고) 종료시간 UI를 아예 보여주지 않는다. 아직 이벤트가 없는
  // 전형(primaryEvent === null)은 confirmDateTime이 항상 schedule 타입으로 새로 만들므로 지원한다.
  const supportsEndTime = !primaryEvent || primaryEvent.eventType === "schedule";

  function startRename() {
    skipRenameBlurRef.current = false;
    setRenameValue(step!.name);
    setIsRenaming(true);
  }

  async function confirmRename() {
    if (skipRenameBlurRef.current) {
      skipRenameBlurRef.current = false;
      setIsRenaming(false);
      return;
    }
    if (!renameValue.trim()) {
      setIsRenaming(false);
      return;
    }
    const ok = await renameStep(step!.id, renameValue);
    if (ok) setIsRenaming(false);
  }

  async function handleConfirmDeleteStep() {
    const ok = await deleteStep(step!.id);
    if (ok) refreshEvents();
    setIsDeleteConfirmOpen(false);
  }

  // 모바일 전용 위/아래 이동 버튼. StepTimeline의 드래그(handleDrop)와 동일하게
  // moveStep(id, "up"|"down")을 그대로 호출할 뿐, 새 reorder 로직은 두지 않는다.
  function handleMoveUp() {
    if (isFirstStep) return;
    moveStep(step!.id, "up");
  }

  function handleMoveDown() {
    if (isLastStep) return;
    moveStep(step!.id, "down");
  }

  function formatDateTime(iso: string, endsAt: string | null) {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const base = `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    if (!endsAt) return base;
    const end = new Date(endsAt);
    return `${base}〜${pad(end.getHours())}:${pad(end.getMinutes())}`;
  }

  function startEditDateTime() {
    skipDateTimeBlurRef.current = false;
    setDateTimeError("");
    if (primaryEvent) {
      const values = eventToFormValues(primaryEvent);
      setDateTimeDraft(primaryEvent.eventType === "schedule" ? values.startsAt : values.dueAt);
      if (primaryEvent.eventType === "schedule" && primaryEvent.endsAt) {
        setEndTimeDraft(formatTimeOfDay(primaryEvent.endsAt));
        setShowEndTime(true);
      } else {
        setEndTimeDraft("");
        setShowEndTime(false);
      }
    } else {
      setDateTimeDraft("");
      setEndTimeDraft("");
      setShowEndTime(false);
    }
    setIsEditingDateTime(true);
  }

  async function confirmDateTime() {
    if (skipDateTimeBlurRef.current) {
      skipDateTimeBlurRef.current = false;
      setIsEditingDateTime(false);
      return;
    }
    if (!dateTimeDraft) {
      setIsEditingDateTime(false);
      return;
    }
    // 종료시간은 시작 "날짜"와 조합해서 만든다 — datetime-local(dateTimeDraft)의 앞 10자리
    // ("YYYY-MM-DD")에 time 인풋 값("HH:MM")을 이어 붙이면 eventFormValuesToRow가 그대로
    // 받는 datetime-local 형식이 된다. showEndTime이 꺼져 있거나 시간이 비어 있으면 ""로
    // 둬서(= endsAt null) 종료시간 없는 상태로 저장한다.
    const endsAtDraft =
      supportsEndTime && showEndTime && endTimeDraft
        ? `${dateTimeDraft.slice(0, 10)}T${endTimeDraft}`
        : "";
    if (endsAtDraft && new Date(endsAtDraft).getTime() <= new Date(dateTimeDraft).getTime()) {
      setDateTimeError(t("companies.events.endsAtBeforeStartsAt"));
      return;
    }
    setDateTimeError("");
    if (primaryEvent) {
      const values = eventToFormValues(primaryEvent);
      if (primaryEvent.eventType === "schedule") {
        values.startsAt = dateTimeDraft;
        values.endsAt = endsAtDraft;
      } else {
        values.dueAt = dateTimeDraft;
      }
      await updateEvent(primaryEvent.id, values);
    } else {
      // 실제 일시가 입력된 지금이 이벤트를 만드는 유일한 시점이다. 그 전에 형식만 먼저
      // 골라뒀다면(pendingFormat) 여기서 함께 반영한다.
      const values = createEmptyEventFormValues("schedule");
      values.title = getStepDisplayName(step!, t);
      values.startsAt = dateTimeDraft;
      values.endsAt = endsAtDraft;
      if (activePendingFormat?.choice === "online") values.onlineUrl = activePendingFormat.value;
      else if (activePendingFormat?.choice === "offline") values.location = activePendingFormat.value;
      const ok = await addEvent(companyId, step!.id, values);
      if (ok) setPendingFormat(null);
    }
    setIsEditingDateTime(false);
  }

  function startEditFormat() {
    skipFormatBlurRef.current = false;
    if (primaryEvent) {
      const isOnline = !!primaryEvent.onlineUrl;
      const isOffline = !!primaryEvent.location;
      setFormatChoiceDraft(isOnline ? "online" : isOffline ? "offline" : "undecided");
      setFormatValueDraft(
        isOnline ? (primaryEvent.onlineUrl ?? "") : isOffline ? (primaryEvent.location ?? "") : ""
      );
    } else if (activePendingFormat) {
      setFormatChoiceDraft(activePendingFormat.choice);
      setFormatValueDraft(activePendingFormat.value);
    } else {
      setFormatChoiceDraft("undecided");
      setFormatValueDraft("");
    }
    setIsEditingFormat(true);
  }

  // 형식 select는 값을 바꾸는 즉시 저장한다(다른 select들과 동일한 규칙) — 온라인/대면을
  // 고르면 값 입력칸이 비어있는 채로 먼저 반영되고, 이어서 그 칸에 실제 URL/장소를 입력해
  // blur/Enter로 한 번 더 저장한다. 미정으로 바꾸면 더 채울 값이 없으므로 바로 편집을 닫는다.
  async function handleFormatChoiceChange(newChoice: FormatChoice) {
    setFormatChoiceDraft(newChoice);
    setFormatValueDraft("");
    if (primaryEvent) {
      const values = eventToFormValues(primaryEvent);
      values.onlineUrl = "";
      values.location = "";
      await updateEvent(primaryEvent.id, values);
    } else {
      setPendingFormat({ stepId: step!.id, choice: newChoice, value: "" });
    }
    if (newChoice === "undecided") {
      setIsEditingFormat(false);
    }
  }

  // EmailAnalysisReview.tsx의 handleFormatChange와 동일한 상호배타 규칙: 온라인이면
  // onlineUrl만, 대면이면 location만 남기고 반대쪽은 비운다.
  async function confirmFormat() {
    if (skipFormatBlurRef.current) {
      skipFormatBlurRef.current = false;
      setIsEditingFormat(false);
      return;
    }
    if (primaryEvent) {
      const values = eventToFormValues(primaryEvent);
      if (formatChoiceDraft === "online") {
        values.onlineUrl = formatValueDraft;
        values.location = "";
      } else if (formatChoiceDraft === "offline") {
        values.location = formatValueDraft;
        values.onlineUrl = "";
      } else {
        values.onlineUrl = "";
        values.location = "";
      }
      await updateEvent(primaryEvent.id, values);
    } else {
      // 일정이 아직 없는 상태에서 형식만 저장하면 실제 일정이 아닌데도 이벤트가 생겨
      // Calendar/Dashboard/Analytics에 가짜 일정으로 노출된다. DB에는 쓰지 않고 로컬
      // state에만 담아둔다 — 실제 일시가 입력되어 이벤트가 만들어질 때(confirmDateTime)
      // 함께 반영된다.
      setPendingFormat({ stepId: step!.id, choice: formatChoiceDraft, value: formatValueDraft });
    }
    setIsEditingFormat(false);
  }

  return (
    <section className="relative">
      {stepsError && (
        <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {stepsError}
        </p>
      )}

      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
          <MaterialIcon name="assignment" size={17} className="shrink-0 text-secondary" />
          {isRenaming ? (
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={confirmRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  skipRenameBlurRef.current = true;
                  setIsRenaming(false);
                }
              }}
              className="min-w-0 flex-1 rounded-stitch-md border border-primary-navy bg-white px-2 py-0.5 text-[15px] font-[500] text-stitch-ink outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={startRename}
              aria-label={t("companies.steps.rename")}
              className="-mx-1.5 -my-0.5 truncate rounded-stitch-md border border-transparent bg-[#f8f9ff] px-1.5 py-0.5 text-left transition-colors hover:border-stitch-border"
            >
              {getStepDisplayName(step, t)}
            </button>
          )}
        </h2>
        {/* 데스크톱은 StepTimeline 드래그로 순서를 바꾸지만, 터치 기기는 draggable이 동작하지
            않아 md 미만에서만 위/아래 이동 버튼을 보여준다. moveStep은 드래그와 동일한 함수. */}
        <div className="flex shrink-0 gap-1 md:hidden">
          <button
            type="button"
            onClick={handleMoveUp}
            disabled={isFirstStep}
            aria-label={t("companies.steps.moveUp")}
            className="flex h-8 w-8 items-center justify-center rounded-stitch-xl border border-stitch-border bg-card text-secondary shadow-sm transition-colors hover:border-primary-navy/40 hover:text-primary-navy disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MaterialIcon name="arrow_upward" size={16} />
          </button>
          <button
            type="button"
            onClick={handleMoveDown}
            disabled={isLastStep}
            aria-label={t("companies.steps.moveDown")}
            className="flex h-8 w-8 items-center justify-center rounded-stitch-xl border border-stitch-border bg-card text-secondary shadow-sm transition-colors hover:border-primary-navy/40 hover:text-primary-navy disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MaterialIcon name="arrow_downward" size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsDeleteConfirmOpen(true)}
          aria-label={t("common.delete")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-stitch-xl border border-stitch-border bg-card text-secondary shadow-sm transition-colors hover:border-error/40 hover:text-error"
        >
          <MaterialIcon name="delete" size={17} />
        </button>
      </div>

      <div className="space-y-4 pl-6">
        <div className="flex items-center gap-4">
          <span className="w-20 shrink-0 text-[11px] font-[400] text-secondary">
            {t("companies.detail.selectionDetail.status")}
          </span>
          <div className="relative">
            {/* waiting은 기본적으로 시스템이 자동으로만 부여하는 상태지만, 순서 변경으로
                현재 진행 단계보다 앞으로 옮겨진 waiting 전형은 이미 지나간 순서로 봐서 상태를
                직접 바꿀 수 있게 한다. 저장된 step_status 값 자체가 아니라 "현재 정렬된
                step_order가 currentStep보다 뒤인가"로 판단해야, 순서만 바꾸고 상태는 그대로
                둔 경우에도(reorderSteps/moveStep은 step_status를 건드리지 않는다) 올바르게
                활성화된다 — isFutureWaitingStep만 select를 비활성으로 둔다. */}
            {isFutureWaitingStep ? (
              <select
                value="waiting"
                disabled
                className="cursor-not-allowed appearance-none rounded-stitch-md border border-stitch-border bg-[#f8f9ff] py-1 pl-3 pr-8 text-[13px] text-secondary opacity-70 outline-none"
              >
                <option value="waiting">{t(STEP_STATUS_LABEL_KEYS.waiting)}</option>
              </select>
            ) : (
              <select
                value={step.stepStatus}
                onChange={(e) => updateStepStatus(step!.id, e.target.value as StepStatus)}
                className="cursor-pointer appearance-none rounded-stitch-md border border-stitch-border bg-[#f8f9ff] py-1 pl-3 pr-8 text-[13px] text-stitch-ink outline-none focus:ring-1 focus:ring-primary-navy/50"
              >
                {/* 현재 진행 단계보다 앞으로 옮겨졌지만 아직 waiting인 전형은 select 값이
                    "waiting"이라 그 옵션도 함께 보여줘야 실제 상태와 표시가 일치한다(다른
                    3개 중 하나로 바꾸면 updateStepStatus가 캐스케이드로 반영). */}
                {(step.stepStatus === "waiting"
                  ? STEP_STATUSES
                  : STEP_STATUSES.filter((status) => status !== "waiting")
                ).map((status) => (
                  <option key={status} value={status}>
                    {t(STEP_STATUS_LABEL_KEYS[status])}
                  </option>
                ))}
              </select>
            )}
            <MaterialIcon
              name="expand_more"
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-secondary"
            />
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span className="w-20 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
            {t("companies.detail.selectionDetail.datetime")}
          </span>
          {isEditingDateTime ? (
            <div className="flex flex-1 flex-col gap-1">
              {/* 그룹 blur: 시작/종료 두 필드와 +/× 버튼이 모두 이 컨테이너 안에 있어,
                  그 사이를 오가는 포커스 이동(relatedTarget이 컨테이너 내부)에서는 저장하지
                  않고, 포커스가 컨테이너 밖으로 완전히 나갈 때만 confirmDateTime을 부른다. */}
              <div
                className="flex flex-wrap items-center gap-2"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    confirmDateTime();
                  }
                }}
              >
                <input
                  ref={startDateTimeInputRef}
                  type="datetime-local"
                  autoFocus
                  value={dateTimeDraft}
                  onChange={(e) => {
                    setDateTimeDraft(e.target.value);
                    setDateTimeError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === "Escape") {
                      skipDateTimeBlurRef.current = true;
                      setIsEditingDateTime(false);
                    }
                  }}
                  className="rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[13px] text-stitch-ink outline-none"
                />
                {supportsEndTime &&
                  (showEndTime ? (
                    <>
                      <span className="text-[13px] text-secondary">〜</span>
                      <input
                        type="time"
                        value={endTimeDraft}
                        onChange={(e) => {
                          setEndTimeDraft(e.target.value);
                          setDateTimeError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                          if (e.key === "Escape") {
                            skipDateTimeBlurRef.current = true;
                            setIsEditingDateTime(false);
                          }
                        }}
                        className="rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[13px] text-stitch-ink outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          // 이 버튼 자신이 사라지기 전에 먼저 시작 시간 입력으로 포커스를
                          // 옮겨둔다 — 그러지 않으면 언마운트가 유발하는 blur의 relatedTarget이
                          // 컨테이너 밖(null/body)이 되어 그룹이 확정된 것으로 오인, 아직
                          // 편집 중인데도 조기에 confirmDateTime이 실행된다.
                          startDateTimeInputRef.current?.focus();
                          setEndTimeDraft("");
                          setShowEndTime(false);
                          setDateTimeError("");
                        }}
                        aria-label={t("common.delete")}
                        className="flex h-6 w-6 items-center justify-center text-secondary transition-colors hover:text-error"
                      >
                        <MaterialIcon name="close" size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowEndTime(true)}
                      className="inline-flex items-center gap-0.5 text-[12px] font-[400] text-primary-navy hover:underline"
                    >
                      <MaterialIcon name="add" size={12} />
                      {t("companies.detail.selectionDetail.addEndTime")}
                    </button>
                  ))}
              </div>
              {dateTimeError && <p className="text-[11px] text-error">{dateTimeError}</p>}
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditDateTime}
              className="-mx-1.5 -my-0.5 rounded-stitch-md border border-transparent bg-[#f8f9ff] px-1.5 py-0.5 text-left text-[13px] font-[400] text-stitch-ink transition-colors hover:border-stitch-border"
            >
              {primaryEvent && primaryEventAt
                ? formatDateTime(primaryEventAt, primaryEvent.endsAt)
                : t("companies.detail.selectionDetail.noDateSet")}
            </button>
          )}
        </div>

        <div className="flex items-start gap-4">
          <span className="w-20 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
            {t("companies.detail.selectionDetail.format")}
          </span>
          {isEditingFormat ? (
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <select
                value={formatChoiceDraft}
                onChange={(e) => handleFormatChoiceChange(e.target.value as FormatChoice)}
                className="rounded-stitch-md border border-stitch-border bg-[#f8f9ff] px-2 py-1 text-[13px] text-stitch-ink outline-none"
              >
                <option value="online">{t("companies.detail.selectionDetail.online")}</option>
                <option value="offline">{t("companies.detail.selectionDetail.offline")}</option>
                <option value="undecided">{t("companies.detail.selectionDetail.noDateSet")}</option>
              </select>
              {formatChoiceDraft !== "undecided" && (
                <input
                  type="text"
                  autoFocus
                  value={formatValueDraft}
                  onChange={(e) => setFormatValueDraft(e.target.value)}
                  onBlur={confirmFormat}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === "Escape") {
                      skipFormatBlurRef.current = true;
                      setIsEditingFormat(false);
                    }
                  }}
                  className="min-w-0 flex-1 rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[13px] text-stitch-ink outline-none"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startEditFormat}
                className="-mx-1.5 -my-0.5 rounded-stitch-md border border-transparent bg-[#f8f9ff] px-1.5 py-0.5 text-left text-[13px] font-[400] text-stitch-ink transition-colors hover:border-stitch-border"
              >
                {primaryEvent
                  ? primaryEvent.onlineUrl
                    ? t("companies.detail.selectionDetail.online")
                    : (primaryEvent.location ?? t("companies.detail.selectionDetail.noDateSet"))
                  : activePendingFormat?.choice === "online"
                    ? t("companies.detail.selectionDetail.online")
                    : activePendingFormat?.choice === "offline"
                      ? activePendingFormat.value || t("companies.detail.selectionDetail.noDateSet")
                      : t("companies.detail.selectionDetail.noDateSet")}
              </button>
              {/* 형식 버튼(클릭 시 인라인 편집 진입)과 같은 줄에 별도 링크로 둔다 — <a>를
                  버튼 안에 중첩하면 안 되고(무효한 HTML), stopPropagation으로 편집 진입 클릭과
                  분리해야 링크 클릭이 startEditFormat을 함께 트리거하지 않는다. */}
              {primaryEvent?.onlineUrl && (
                <a
                  href={primaryEvent.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-[12px] font-[400] text-primary-navy hover:underline"
                >
                  {t(
                    `companies.detail.selectionDetail.meetingLink.${getMeetingLinkKey(primaryEvent.onlineUrl)}`
                  )}
                  <MaterialIcon name="open_in_new" size={13} />
                </a>
              )}
            </div>
          )}
        </div>

        {otherEventsCount > 0 && (
          <p className="pl-24 text-[11px] text-secondary">
            {t("companies.detail.selectionDetail.otherEventsNotice", { count: otherEventsCount })}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title={t("companies.steps.deleteConfirm", { name: getStepDisplayName(step, t) })}
        description={t("common.cannotUndo")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteStep}
      />
    </section>
  );
}
