"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CompanyCreateForm from "@/components/CompanyCreateForm";
import { useAiDrawer } from "@/lib/ai-drawer-context";
import StepReconcileDialog from "@/components/companies/StepReconcileDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useToast } from "@/components/ui/Toast";
import {
  companyToFormValues,
  OVERALL_STATUS_BADGE_CLASS,
  OVERALL_STATUSES,
  PRIORITIES,
  type Company,
  type OverallStatus,
} from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { useStepReconcileCheck } from "@/lib/useStepReconcileCheck";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { DEFAULT_STEP_KEYS, getCurrentStep, getStepDisplayName } from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import { getNextEvent } from "@/lib/events";
import { useCompanyContacts } from "@/lib/company-contacts-context";
import { useCompanyNotes } from "@/lib/company-notes-context";
import { useCompanyCredentials } from "@/lib/company-credentials-context";
import { useNextActions } from "@/lib/next-actions-context";
import { diffInDays, formatTimeOfDay, todayKey } from "@/lib/date";
import { useT } from "@/lib/locale-context";

const ALL = "전체";
const PAGE_SIZE_OPTIONS = [10, 25, 50];

// docs/stitch/메인페이지 5개/jobcal_companies_standardized_design_refresh/screen.png에는
// 없는 기존 기능들이다. 기능/상태 로직은 그대로 두고 기본 화면 노출만 끈다. 나중에 해당
// 요소를 다루는 Stitch 화면이 나오면 이 상수만 true로 바꾸면 된다.
const SHOW_EXTRA_STATUS_TABS = false; // 입사/지원 취소 탭
const SHOW_ADD_FROM_EMAIL_LINK = false; // 메일로 추가 버튼
const SHOW_PAGE_SIZE_SELECT = false; // 페이지당 건수 선택
// Stitch가 보여주는 4개 탭(전체/選考中/内定/不採用)만 기본 노출한다.
const STITCH_VISIBLE_STATUSES = new Set(["in_progress", "offer", "rejected"]);

// docs/stitch/메인페이지 5개/jobcal_companies_standardized_design_refresh/code.html은
// "高"만 빨간색이고 "中"/"低"는 둘 다 같은 회색 배지다(3단계 신호등이 아니라 2단계).
const PRIORITY_IS_HIGH = (priority: string) => priority === "high";

function formatNextSchedule(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${formatTimeOfDay(iso)}`;
}

// Stitch code.html의 "最終更新" 표기(今日 10:30 / 昨日 18:15 / 2日前 / 1週間前)를 재현한다.
// company.updatedAt은 날짜만 저장하므로(lib/companies.ts) 시:분은 표시하지 않는다.
function formatUpdatedRelative(dateKey: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diff = diffInDays(dateKey, todayKey());
  if (diff <= 0) return t("companies.list.updatedRelative.today");
  if (diff === 1) return t("companies.list.updatedRelative.yesterday");
  if (diff < 7) return t("companies.list.updatedRelative.daysAgo", { days: diff });
  const weeks = Math.max(1, Math.floor(diff / 7));
  return t("companies.list.updatedRelative.weeksAgo", { weeks });
}

export default function CompaniesPage() {
  const t = useT();
  const router = useRouter();
  const { showToast } = useToast();
  const statusLabels: Record<string, string> = {
    in_progress: t("companies.list.status.inProgress"),
    offer: t("companies.list.status.offer"),
    joined: t("companies.list.status.joined"),
    rejected: t("companies.list.status.rejected"),
    cancelled: t("companies.list.status.cancelled"),
  };
  const priorityLabels: Record<string, string> = {
    high: t("companies.list.priority.high"),
    medium: t("companies.list.priority.medium"),
    low: t("companies.list.priority.low"),
  };

  const {
    companies,
    addCompany,
    updateCompany,
    deleteCompany,
    loading: companiesLoading,
    error: companiesError,
  } = useCompanies();
  const stepReconcile = useStepReconcileCheck();
  const { steps, loading: stepsLoading, refresh: refreshSteps, error: stepsError } =
    useApplicationSteps();
  const { events, loading: eventsLoading, refresh: refreshEvents, error: eventsError } = useEvents();
  // Dashboard와 동일한 이유 — 세 Context 중 하나라도 실패하면 배너 1개만 보여준다.
  const hasLoadError = !!(companiesError || stepsError || eventsError);
  const { refresh: refreshContacts } = useCompanyContacts();
  const { refresh: refreshNotes } = useCompanyNotes();
  const { refresh: refreshCredentials } = useCompanyCredentials();
  const { refresh: refreshNextActions } = useNextActions();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [stepFilter, setStepFilter] = useState<string>(ALL);
  const [isAddOpen, setIsAddOpen] = useState(false);
  // components/dashboard/DashboardEmptyState.tsx와 동일하게 app/(app)/layout.tsx의
  // handleOpenAiDrawer를 그대로 여는 것 — Drawer open 로직을 여기서 새로 만들지 않는다.
  const { open: openAiDrawer } = useAiDrawer();
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  // 저장 중인 행의 id만 담아 그 select를 잠깐 비활성화한다 — 응답이 오기 전에 같은 행에서
  // 다시 값을 바꿔 저장이 겹치는 것을 막는다. 실패해도 로컬 companies 상태가 갱신되지
  // 않으므로(updateCompany 참고) select는 원래 값을 그대로 보여준다(별도 롤백 불필요).
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  // Company Detail 헤더의 handleOverallStatusChange와 동일하게 stepReconcile.guardSubmit을
  // 그대로 재사용한다 — 미확정 전형이 남은 채 최종 상태로 바뀌면 확인 모달이 뜬다.
  async function handleStatusChange(company: Company, newStatus: OverallStatus) {
    setSavingStatusId(company.id);
    const proceed = stepReconcile.guardSubmit(company, async (values) => {
      const ok = await updateCompany(company.id, values);
      setSavingStatusId(null);
      // 실패해도 로컬 companies 상태가 갱신되지 않아(위 주석 참고) select는 이미 원래
      // 값을 그대로 보여준다 — 여기서는 실패했다는 사실만 안내한다.
      if (!ok) showToast(t("common.saveFailed"), "error");
    });
    proceed({ ...companyToFormValues(company), overallStatus: newStatus });
  }

  const loading = companiesLoading || stepsLoading || eventsLoading;

  // application_steps/events를 직접 사용해 기업별 "현재 전형", "다음 일정"을 계산한다.
  // currentStepKey는 전형 필터(stepFilter)와의 비교 기준으로, 기본 전형이면 step_key(언어와
  // 무관한 안정적인 값), 사용자 커스텀 전형이면 null이다. 화면 표시는 currentStepDisplayName
  // (locale 번역)을 별도로 둬서, 필터 비교가 번역된 문자열에 의존하지 않게 한다.
  const companyRows = companies.map((company) => {
    const companySteps = steps.filter((step) => step.companyId === company.id);
    const companyEvents = events.filter((event) => event.companyId === company.id);
    const nextEvent = getNextEvent(companyEvents);
    const nextEventAt = nextEvent ? (nextEvent.startsAt ?? nextEvent.dueAt) : null;
    const currentStep = getCurrentStep(companySteps);

    return {
      company,
      currentStepKey: currentStep?.stepKey ?? null,
      currentStepDisplayName: currentStep
        ? getStepDisplayName(currentStep, t)
        : t("dashboard.noStepLabel"),
      nextEventAt,
    };
  });

  // 상태 탭 건수는 검색/우선순위/전형 필터까지만 반영하고, 상태 자체는 제외해서 계산한다.
  const baseFilteredRows = companyRows.filter(({ company, currentStepKey }) => {
    const matchesSearch = company.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesPriority = priorityFilter === ALL || company.priority === priorityFilter;
    const matchesStep = stepFilter === ALL || currentStepKey === stepFilter;
    return matchesSearch && matchesPriority && matchesStep;
  });

  // 필터링 자체(filteredCompanyRows)는 모든 상태를 계속 지원한다. 여기서 거르는 건
  // "기본 화면에 보여줄 탭 버튼" 목록뿐이라, statusFilter는 숨긴 상태값으로도 여전히
  // 설정될 수 있다(기능 유지).
  const visibleStatuses = SHOW_EXTRA_STATUS_TABS
    ? OVERALL_STATUSES
    : OVERALL_STATUSES.filter((status) => STITCH_VISIBLE_STATUSES.has(status));
  const statusTabs = [
    { key: ALL, label: t("companies.list.status.all") },
    ...visibleStatuses.map((status) => ({ key: status, label: statusLabels[status] })),
  ];

  const filteredCompanyRows = baseFilteredRows.filter(
    ({ company }) => statusFilter === ALL || company.overallStatus === statusFilter
  );

  const isFiltering =
    search.trim() !== "" || statusFilter !== ALL || priorityFilter !== ALL || stepFilter !== ALL;

  function resetFilters() {
    setSearch("");
    setStatusFilter(ALL);
    setPriorityFilter(ALL);
    setStepFilter(ALL);
  }

  // 필터/페이지 크기가 바뀌면 항상 1페이지부터 다시 보여준다.
  // (렌더링 중 상태를 조정하는 React 권장 패턴: effect 대신 이전 값과 비교해서 즉시 반영)
  const filterKey = `${search}|${statusFilter}|${priorityFilter}|${stepFilter}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const totalCount = filteredCompanyRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(currentPage, totalPages);
  const paginatedRows = filteredCompanyRows.slice((page - 1) * pageSize, page * pageSize);

  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
  const endPage = Math.min(totalPages, startPage + 4);
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  // 검색/필터 결과가 0건인 것과, 애초에 등록된 기업이 하나도 없는 것은 다른 상황이므로
  // 문구를 분리한다(전자는 조건 조정 유도, 후자는 첫 기업 등록 유도).
  const hasNoCompaniesAtAll = companies.length === 0;

  function handleDeleteClick(company: Company) {
    setDeleteTarget(company);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const ok = await deleteCompany(deleteTarget.id);
    if (ok) {
      showToast(t("companies.list.deleteSuccessToast", { name: deleteTarget.name }));
      // DB에서는 ON DELETE CASCADE로 정리되지만, 다른 Context(steps/events/contacts/notes)의
      // 로컬 state는 companies와 별개라 자동으로 갱신되지 않는다. 삭제 성공 시에만 각자의
      // refresh()로 서버 최신 상태를 다시 받아와, 새로고침 없이 다른 화면으로 이동해도
      // 삭제된 기업의 유령 데이터가 보이지 않게 한다.
      refreshSteps();
      refreshEvents();
      refreshContacts();
      refreshNotes();
      refreshCredentials();
      refreshNextActions();
      setDeleteTarget(null);
    } else {
      // 확인 다이얼로그는 닫지 않는다 — ConfirmDialog 자신의 isSubmitting은 이미
      // finally로 복구되어 다시 시도할 수 있는 상태로 남는다.
      showToast(t("common.deleteFailed"), "error");
    }
  }

  return (
    <div className="min-h-screen bg-stitch-bg min-[1600px]:min-h-full">
      <div className="mx-auto max-w-[1200px] px-6 pb-6 pt-14 font-[family-name:var(--font-hanken-grotesk)] font-[350] tracking-[-0.025em] text-stitch-ink">
        <div className="mb-16 flex w-full items-end justify-between">
          <div>
            <h2 className="mb-1.5 text-[36px] font-[400] leading-[1.2] tracking-tight text-stitch-ink">
              {t("companies.list.title")}
            </h2>
            <p className="text-[16px] text-secondary">{t("companies.list.description")}</p>
          </div>
          <div className="flex h-fit items-center gap-2">
            {SHOW_ADD_FROM_EMAIL_LINK && (
              <Link
                href="/companies/new-from-email"
                className="flex h-fit items-center rounded-stitch-xl border border-stitch-border bg-card px-4 py-2 text-[12px] font-[400] text-stitch-ink transition-all hover:bg-[#f8f9ff]"
              >
                {t("companies.list.addFromEmail")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex h-fit items-center gap-1 rounded-stitch-xl bg-primary-navy px-4 py-2 text-[12px] font-[400] text-white shadow-sm transition-all hover:opacity-90"
            >
              <MaterialIcon name="add" size={16} />
              {t("companies.list.addCompany")}
            </button>
          </div>
        </div>

        <div className="flex h-[710px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex shrink-0 flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex gap-6">
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={
                    "pb-1 text-[13px] transition-colors " +
                    (statusFilter === tab.key
                      ? "border-b-[1.5px] border-stitch-ink font-[400] text-stitch-ink"
                      : "text-secondary hover:text-stitch-ink")
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <MaterialIcon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("companies.list.searchPlaceholder")}
                  className="w-full rounded-stitch-xl border border-stitch-border bg-[#f8f9ff] py-1.5 pl-9 pr-4 text-[13px] text-stitch-ink outline-none placeholder:text-secondary focus:ring-1 focus:ring-stitch-border md:w-56"
                />
              </div>

              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="cursor-pointer appearance-none rounded-stitch-xl border border-stitch-border bg-[#f8f9ff] py-1.5 pl-3 pr-8 text-[13px] text-stitch-ink outline-none focus:ring-1 focus:ring-stitch-border"
                >
                  <option value={ALL}>{t("companies.list.filters.priorityPlaceholder")}</option>
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabels[priority]}
                    </option>
                  ))}
                </select>
                <MaterialIcon
                  name="expand_more"
                  size={14}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-secondary"
                />
              </div>

              <div className="relative">
                <select
                  value={stepFilter}
                  onChange={(e) => setStepFilter(e.target.value)}
                  className="cursor-pointer appearance-none rounded-stitch-xl border border-stitch-border bg-[#f8f9ff] py-1.5 pl-3 pr-8 text-[13px] text-stitch-ink outline-none focus:ring-1 focus:ring-stitch-border"
                >
                  <option value={ALL}>{t("companies.list.filters.stepPlaceholder")}</option>
                  {DEFAULT_STEP_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t(`applicationSteps.default.${key}`)}
                    </option>
                  ))}
                </select>
                <MaterialIcon
                  name="expand_more"
                  size={14}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-secondary"
                />
              </div>

              {isFiltering && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[12px] text-secondary underline-offset-2 hover:text-stitch-ink hover:underline"
                >
                  {t("companies.list.filters.reset")}
                </button>
              )}
            </div>
          </div>

          {hasLoadError && (
            <p className="mb-4 shrink-0 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {t("common.dataLoadFailed")}
            </p>
          )}

          {loading ? (
            <LoadingState>{t("companies.list.loading")}</LoadingState>
          ) : (
            <div className="flex flex-1 flex-col">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
                  <thead>
                    <tr className="border-b border-stitch-border">
                      <th className="w-[36%] py-3 px-3 text-[11px] font-[400] tracking-normal text-secondary">
                        {t("companies.list.columns.company")}
                      </th>
                      <th className="w-[19%] whitespace-nowrap py-3 px-2 text-[11px] font-[400] tracking-normal text-secondary">
                        {t("companies.list.columns.currentStep")}
                      </th>
                      <th className="w-[90px] whitespace-nowrap py-3 px-2 text-[11px] font-[400] tracking-normal text-secondary">
                        {t("companies.list.columns.status")}
                      </th>
                      <th className="w-[15%] whitespace-nowrap py-3 px-2 text-[11px] font-[400] tracking-normal text-secondary">
                        {t("companies.list.columns.nextSchedule")}
                      </th>
                      <th className="w-[80px] whitespace-nowrap py-3 px-2 text-[11px] font-[400] tracking-normal text-secondary">
                        {t("companies.list.columns.priority")}
                      </th>
                      <th className="w-[100px] whitespace-nowrap py-3 px-2 text-[11px] font-[400] tracking-normal text-secondary">
                        {t("companies.list.columns.updatedAt")}
                      </th>
                      <th className="w-8 py-3 px-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stitch-border">
                    {paginatedRows.map(({ company, currentStepDisplayName, nextEventAt }) => (
                      <tr
                        key={company.id}
                        onClick={() => router.push(`/companies/${company.id}`)}
                        className="group cursor-pointer transition-colors hover:bg-black/[0.015]"
                      >
                        <td className="overflow-hidden text-ellipsis whitespace-nowrap py-3 px-3 text-[14px] text-stitch-ink">
                          <span className="overflow-hidden text-ellipsis font-[400]">
                            {company.name}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3 px-2 text-[12px] text-secondary">
                          {currentStepDisplayName}
                        </td>
                        <td className="py-3 px-2">
                          {/* Company Detail 헤더와 동일한 pill select — 우선순위는 지금처럼
                              읽기 전용 배지로 남겨두고 상태만 목록에서 바로 고칠 수 있게 한다. */}
                          <div className="flex items-center gap-1.5">
                            <div className="relative inline-block">
                              <select
                                value={company.overallStatus}
                                disabled={savingStatusId === company.id}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  handleStatusChange(company, e.target.value as OverallStatus)
                                }
                                className={
                                  "cursor-pointer appearance-none rounded-full border py-1 pl-2.5 pr-6 text-[11px] font-[400] outline-none disabled:cursor-not-allowed disabled:opacity-60 " +
                                  OVERALL_STATUS_BADGE_CLASS[company.overallStatus]
                                }
                              >
                                {OVERALL_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {statusLabels[status]}
                                  </option>
                                ))}
                              </select>
                              <MaterialIcon
                                name="expand_more"
                                size={13}
                                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-current"
                              />
                            </div>
                            {savingStatusId === company.id && (
                              <MaterialIcon
                                name="progress_activity"
                                size={14}
                                className="animate-spin text-secondary"
                              />
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap py-3 px-2 text-[12px] tracking-normal text-secondary">
                          {nextEventAt ? formatNextSchedule(nextEventAt) : "-"}
                        </td>
                        <td className="py-3 px-2">
                          {PRIORITY_IS_HIGH(company.priority) ? (
                            <span className="whitespace-nowrap rounded-stitch-md bg-error/10 px-2 py-0.5 text-[11px] font-[400] text-error">
                              {priorityLabels[company.priority]}
                            </span>
                          ) : (
                            <span className="whitespace-nowrap rounded-stitch-md border border-stitch-border bg-[#f8f9ff] px-2 py-0.5 text-[11px] font-[400] text-secondary">
                              {priorityLabels[company.priority]}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-3 px-2 text-[12px] tracking-normal text-secondary">
                          {formatUpdatedRelative(company.updatedAt, t)}
                        </td>
                        <td className="relative py-3 px-2 text-center">
                          {/* 상태/우선순위/이름 모두 Company Detail에서 인라인으로 바로
                              고칠 수 있게 되면서, 이 자리엔 그대로 남겨두는 삭제만 직접
                              아이콘 버튼으로 둔다(⋮ 메뉴는 항목이 1개뿐이라 불필요). */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(company);
                            }}
                            className="flex w-full items-center justify-center text-secondary opacity-100 transition-colors hover:text-error md:opacity-0 md:group-hover:opacity-100"
                            aria-label={t("companies.list.actions.delete")}
                          >
                            <MaterialIcon name="delete" size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {paginatedRows.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          {hasNoCompaniesAtAll ? (
                            <div className="flex flex-col items-center gap-5 py-6">
                              <EmptyState
                                icon="apartment"
                                title={t("companies.list.empty.noCompaniesTitle")}
                                description={t("companies.list.empty.noCompaniesDescription")}
                              />
                              {/* components/dashboard/DashboardEmptyState.tsx와 동일한 시각
                                  언어(Primary: AI로 열기, Secondary: 기존 CompanyCreateForm) —
                                  버튼 클래스도 그대로 재사용한다. */}
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={openAiDrawer}
                                  className="flex items-center gap-1.5 rounded-stitch-xl bg-primary-navy px-5 py-2.5 text-[13px] font-[500] text-white shadow-sm transition-all hover:opacity-90"
                                >
                                  <MaterialIcon name="auto_awesome" size={16} />
                                  {t("header.aiCta")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsAddOpen(true)}
                                  className="rounded-stitch-xl border border-stitch-border px-5 py-2.5 text-[13px] font-[500] text-stitch-ink transition-colors hover:bg-black/[0.02]"
                                >
                                  {t("dashboard.emptyState.manualCta")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <EmptyState icon="search_off" title={t("companies.list.empty.noResults")} />
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6 pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] tracking-normal text-secondary">
                    {t("companies.list.pagination.rangeLabel", {
                      total: totalCount,
                      from: totalCount === 0 ? 0 : (page - 1) * pageSize + 1,
                      to: Math.min(page * pageSize, totalCount),
                    })}
                  </span>
                  {SHOW_PAGE_SIZE_SELECT && (
                    <div className="relative">
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="cursor-pointer appearance-none rounded-stitch-md border border-stitch-border bg-[#f8f9ff] py-1 pl-2 pr-6 text-[11px] text-secondary outline-none focus:ring-1 focus:ring-stitch-border"
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {t("companies.list.pagination.perPage", { size })}
                          </option>
                        ))}
                      </select>
                      <MaterialIcon
                        name="expand_more"
                        size={12}
                        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-secondary"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setCurrentPage(page - 1)}
                    className="flex h-6 w-6 items-center justify-center text-secondary transition-colors hover:text-stitch-ink disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t("companies.list.pagination.previous")}
                  >
                    <MaterialIcon name="chevron_left" size={16} />
                  </button>
                  {pageNumbers.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCurrentPage(n)}
                      className={
                        "flex h-6 w-6 items-center justify-center rounded-stitch-md text-[11px] transition-colors " +
                        (n === page
                          ? "bg-primary-navy font-[400] text-white"
                          : "text-secondary hover:bg-black/[0.02]")
                      }
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setCurrentPage(page + 1)}
                    className="flex h-6 w-6 items-center justify-center text-secondary transition-colors hover:text-stitch-ink disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t("companies.list.pagination.next")}
                  >
                    <MaterialIcon name="chevron_right" size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {isAddOpen && (
          <CompanyCreateForm
            title={t("companies.list.addCompanyModalTitle")}
            description={t("companies.list.addCompanyModalDescription")}
            onCancel={() => setIsAddOpen(false)}
            onSubmit={async (values) => {
              const created = await addCompany(values);
              if (created) {
                setIsAddOpen(false);
                // 기본 8개 전형은 DB 트리거가 생성하므로, 방금 만든 기업의 전형이
                // 클라이언트 상태에 보이도록 한 번 더 불러온다.
                refreshSteps();
                showToast(t("companies.list.addSuccessToast", { name: values.name }));
                // 이름만 입력하고 나머지는 비어 있는 상태라, 바로 상세 화면으로 이동해
                // 이어서 채울 수 있게 한다.
                router.push(`/companies/${created.id}`);
              } else {
                showToast(t("common.saveFailed"), "error");
              }
            }}
          />
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title={t("companies.list.deleteConfirm", { name: deleteTarget?.name ?? "" })}
          description={t("common.cannotUndo")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          variant="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />

        {stepReconcile.reconcileState && (
          <StepReconcileDialog
            companyName={stepReconcile.reconcileState.company.name}
            onCancel={() => {
              setSavingStatusId(null);
              stepReconcile.cancel();
            }}
            onConfirm={stepReconcile.confirm}
          />
        )}
      </div>
    </div>
  );
}
