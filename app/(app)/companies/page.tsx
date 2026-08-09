"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, CalendarDays, MoreHorizontal, Search } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import CompanyForm from "@/components/CompanyForm";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import {
  OVERALL_STATUSES,
  PRIORITIES,
  createEmptyCompanyFormValues,
  companyToFormValues,
  type Company,
} from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { DEFAULT_STEP_KEYS, getCurrentStep, getStepDisplayName } from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import { getNextEvent } from "@/lib/events";
import { useCompanyContacts } from "@/lib/company-contacts-context";
import { useCompanyNotes } from "@/lib/company-notes-context";
import { dateKeyOf, diffInDays, formatTimeOfDay, todayKey } from "@/lib/date";
import { useLocale, useT } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";

const ALL = "전체";
const PAGE_SIZE_OPTIONS = [10, 25, 50];

// components/dashboard/UpcomingSchedule.tsx와 동일한 방식: 요일 약칭만 locale별 배열로 분기.
const WEEKDAY_LABELS: Record<Locale, string[]> = {
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  ko: ["일", "월", "화", "수", "목", "금", "토"],
};

// design.md 색상 토큰 재사용: 높음=Error(danger), 보통=Warning, 낮음=Success
const PRIORITY_BADGE_VARIANT: Record<string, BadgeVariant> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

// components/dashboard/UpcomingSchedule.tsx의 formatRowDate와 동일한 규칙(오늘/내일/MM.DD (요일)).
// "오늘"/"내일"은 대시보드와 동일한 개념이라 dashboard.today/tomorrow 키를 그대로 재사용한다.
function formatRelativeDate(iso: string, t: (key: string) => string, weekdayLabels: string[]) {
  const key = dateKeyOf(iso);
  const diff = diffInDays(todayKey(), key);
  if (diff === 0) return t("dashboard.today");
  if (diff === 1) return t("dashboard.tomorrow");

  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} (${weekdayLabels[date.getDay()]})`;
}

function getInitials(name: string) {
  return name.trim().slice(0, 2);
}

export default function CompaniesPage() {
  const t = useT();
  const { showToast } = useToast();
  const { locale } = useLocale();
  const weekdayLabels = WEEKDAY_LABELS[locale];
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
    error,
  } = useCompanies();
  const { steps, loading: stepsLoading, refresh: refreshSteps } = useApplicationSteps();
  const { events, loading: eventsLoading, refresh: refreshEvents } = useEvents();
  const { refresh: refreshContacts } = useCompanyContacts();
  const { refresh: refreshNotes } = useCompanyNotes();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [stepFilter, setStepFilter] = useState<string>(ALL);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);

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
    const nextEventStep = nextEvent
      ? companySteps.find((s) => s.id === nextEvent.applicationStepId)
      : undefined;
    const nextEventStepName = nextEvent
      ? (nextEventStep ? getStepDisplayName(nextEventStep, t) : nextEvent.title)
      : null;
    const currentStep = getCurrentStep(companySteps);

    return {
      company,
      currentStepKey: currentStep?.stepKey ?? null,
      currentStepDisplayName: currentStep
        ? getStepDisplayName(currentStep, t)
        : t("dashboard.noStepLabel"),
      nextEventAt,
      nextEventStepName,
    };
  });

  // 상태 탭 건수는 검색/우선순위/전형 필터까지만 반영하고, 상태 자체는 제외해서 계산한다.
  const baseFilteredRows = companyRows.filter(({ company, currentStepKey }) => {
    const matchesSearch = company.name
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesPriority = priorityFilter === ALL || company.priority === priorityFilter;
    const matchesStep = stepFilter === ALL || currentStepKey === stepFilter;
    return matchesSearch && matchesPriority && matchesStep;
  });

  const statusTabs = [
    { key: ALL, label: t("companies.list.status.all"), count: baseFilteredRows.length },
    ...OVERALL_STATUSES.map((status) => ({
      key: status,
      label: statusLabels[status],
      count: baseFilteredRows.filter(({ company }) => company.overallStatus === status).length,
    })),
  ];

  const filteredCompanyRows = baseFilteredRows.filter(
    ({ company }) => statusFilter === ALL || company.overallStatus === statusFilter
  );

  const isFiltering =
    search.trim() !== "" ||
    statusFilter !== ALL ||
    priorityFilter !== ALL ||
    stepFilter !== ALL;

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
  const pageNumbers = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  // 검색/필터 결과가 0건인 것과, 애초에 등록된 기업이 하나도 없는 것은 다른 상황이므로
  // 문구를 분리한다(전자는 조건 조정 유도, 후자는 첫 기업 등록 유도).
  const hasNoCompaniesAtAll = companies.length === 0;

  function handleDeleteClick(company: Company) {
    setActiveMenuId(null);
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
    }
    setDeleteTarget(null);
  }

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-foreground">
            {t("companies.list.title")}
          </h1>
          <p className="mt-1 text-sm text-secondary">{t("companies.list.description")}</p>
        </div>
        <Input
          type="text"
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("companies.list.searchPlaceholder")}
          containerClassName="w-full sm:w-64"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          containerClassName="w-36"
        >
          <option value={ALL}>{t("companies.list.filters.allPriority")}</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabels[priority]}
            </option>
          ))}
        </Select>
        <Select
          value={stepFilter}
          onChange={(e) => setStepFilter(e.target.value)}
          containerClassName="w-36"
        >
          <option value={ALL}>{t("companies.list.filters.allStep")}</option>
          {DEFAULT_STEP_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`applicationSteps.default.${key}`)}
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" disabled={!isFiltering} onClick={resetFilters}>
          {t("companies.list.filters.reset")}
        </Button>
        <Link
          href="/companies/new-from-email"
          className="ml-auto flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-background"
        >
          {t("companies.list.addFromEmail")}
        </Link>
        <Button type="button" variant="primary" onClick={() => setIsAddOpen(true)}>
          {t("companies.list.addCompany")}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-border">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key)}
            className={
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 " +
              (statusFilter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:text-foreground")
            }
          >
            {tab.label} {tab.count}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {loading ? (
        <LoadingState>{t("companies.list.loading")}</LoadingState>
      ) : (
        <>
        {/* 데스크톱/태블릿: 기존 테이블 그대로 (md 이상) */}
        <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-secondary">
                <th className="px-6 py-3.5 font-medium">{t("companies.list.columns.company")}</th>
                <th className="px-6 py-3.5 font-medium">
                  {t("companies.list.columns.currentStep")}
                </th>
                <th className="px-6 py-3.5 font-medium">{t("companies.list.columns.status")}</th>
                <th className="px-6 py-3.5 font-medium">
                  {t("companies.list.columns.nextSchedule")}
                </th>
                <th className="px-6 py-3.5 font-medium">{t("companies.list.columns.priority")}</th>
                <th className="px-6 py-3.5 font-medium">
                  {t("companies.list.columns.updatedAt")}
                </th>
                <th className="w-10 px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.map(({ company, currentStepDisplayName, nextEventAt, nextEventStepName }) => (
                <tr key={company.id} className="transition-colors duration-150 hover:bg-background">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(company.name)}
                      </span>
                      <Link
                        href={`/companies/${company.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {company.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="neutral">{currentStepDisplayName}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={company.overallStatus} />
                  </td>
                  <td className="px-6 py-4">
                    {nextEventAt ? (
                      <div className="flex items-start gap-1.5">
                        <CalendarDays size={14} className="mt-0.5 shrink-0 text-secondary" />
                        <div>
                          <p className="text-foreground">
                            {formatRelativeDate(nextEventAt, t, weekdayLabels)}{" "}
                            {formatTimeOfDay(nextEventAt)}
                          </p>
                          <p className="text-xs text-secondary">{nextEventStepName}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-secondary">{t("companies.list.noSchedule")}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={PRIORITY_BADGE_VARIANT[company.priority]}>
                      {priorityLabels[company.priority]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-secondary">{company.updatedAt}</td>
                  <td className="relative px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuId((id) => (id === company.id ? null : company.id))
                      }
                      className="rounded-md p-1.5 text-secondary hover:bg-background hover:text-foreground"
                      aria-label={t("companies.list.actionsMenuLabel", { name: company.name })}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {activeMenuId === company.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenuId(null)}
                        />
                        <div className="absolute right-4 top-10 z-20 w-32 rounded-lg border border-border bg-card py-1 text-left shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCompany(company);
                              setActiveMenuId(null);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background"
                          >
                            {t("companies.list.actions.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(company)}
                            className="block w-full px-3 py-2 text-left text-sm text-error hover:bg-background"
                          >
                            {t("companies.list.actions.delete")}
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}

              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    {hasNoCompaniesAtAll ? (
                      <div className="flex flex-col items-center gap-4 py-2">
                        <EmptyState
                          icon={Building2}
                          title={t("companies.list.empty.noCompaniesTitle")}
                          description={t("companies.list.empty.noCompaniesDescription")}
                        />
                        <Button type="button" variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
                          {t("companies.list.addCompany")}
                        </Button>
                      </div>
                    ) : (
                      <EmptyState icon={Search} title={t("companies.list.empty.noResults")} />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 모바일: 테이블 대신 카드 목록 (md 미만). 검색/필터/상태 탭/페이지네이션은
            위·아래에서 공통으로 재사용하고, 행 하나당 카드 하나로만 바꾼다. */}
        <div className="flex flex-col gap-3 md:hidden">
          {paginatedRows.length === 0 ? (
            <div className="rounded-lg border border-border bg-card">
              {hasNoCompaniesAtAll ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <EmptyState
                    icon={Building2}
                    title={t("companies.list.empty.noCompaniesTitle")}
                    description={t("companies.list.empty.noCompaniesDescription")}
                  />
                  <Button type="button" variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
                    {t("companies.list.addCompany")}
                  </Button>
                </div>
              ) : (
                <EmptyState icon={Search} title={t("companies.list.empty.noResults")} />
              )}
            </div>
          ) : (
            paginatedRows.map(({ company, currentStepDisplayName, nextEventAt, nextEventStepName }) => (
              <div key={company.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/companies/${company.id}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(company.name)}
                    </span>
                    <span className="truncate font-medium text-foreground">{company.name}</span>
                  </Link>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuId((id) => (id === company.id ? null : company.id))
                      }
                      className="rounded-md p-1.5 text-secondary hover:bg-background hover:text-foreground"
                      aria-label={t("companies.list.actionsMenuLabel", { name: company.name })}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {activeMenuId === company.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenuId(null)}
                        />
                        <div className="absolute right-0 top-9 z-20 w-32 rounded-lg border border-border bg-card py-1 text-left shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCompany(company);
                              setActiveMenuId(null);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-background"
                          >
                            {t("companies.list.actions.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(company)}
                            className="block w-full px-3 py-2 text-left text-sm text-error hover:bg-background"
                          >
                            {t("companies.list.actions.delete")}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{currentStepDisplayName}</Badge>
                  <StatusBadge status={company.overallStatus} />
                  <Badge variant={PRIORITY_BADGE_VARIANT[company.priority]}>
                    {priorityLabels[company.priority]}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  {nextEventAt ? (
                    <div className="flex items-start gap-1.5 text-foreground">
                      <CalendarDays size={14} className="mt-0.5 shrink-0 text-secondary" />
                      <div>
                        <p>
                          {formatRelativeDate(nextEventAt, t, weekdayLabels)}{" "}
                          {formatTimeOfDay(nextEventAt)}
                        </p>
                        {nextEventStepName && (
                          <p className="text-secondary">{nextEventStepName}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-secondary">{t("companies.list.noSchedule")}</span>
                  )}
                  <span className="shrink-0 text-secondary">{company.updatedAt}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 페이지네이션은 데스크톱 테이블/모바일 카드 공통으로 하나만 둔다. */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-6 py-4">
          <p className="text-sm text-secondary">
            {t("companies.list.pagination.totalPrefix")}{" "}
            <span className="font-medium text-foreground">{totalCount}</span>
            {t("companies.list.pagination.totalSuffix")}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setCurrentPage(page - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-secondary hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t("companies.list.pagination.previous")}
              >
                ‹
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCurrentPage(n)}
                  className={
                    "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium " +
                    (n === page
                      ? "bg-primary text-white"
                      : "text-foreground hover:bg-background")
                  }
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setCurrentPage(page + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-secondary hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t("companies.list.pagination.next")}
              >
                ›
              </button>
            </div>
            <Select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              containerClassName="w-32"
              className="h-9"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {t("companies.list.pagination.perPage", { size })}
                </option>
              ))}
            </Select>
          </div>
        </div>
        </>
      )}

      {isAddOpen && (
        <CompanyForm
          title={t("companies.list.addCompanyModalTitle")}
          initialValues={createEmptyCompanyFormValues()}
          onCancel={() => setIsAddOpen(false)}
          onSubmit={async (values) => {
            const ok = await addCompany(values);
            if (ok) {
              setIsAddOpen(false);
              // 기본 8개 전형은 DB 트리거가 생성하므로, 방금 만든 기업의 전형이
              // 클라이언트 상태에 보이도록 한 번 더 불러온다.
              refreshSteps();
              showToast(t("companies.list.addSuccessToast", { name: values.name }));
            }
          }}
        />
      )}

      {editingCompany && (
        <CompanyForm
          title={t("companies.list.editCompanyModalTitle")}
          initialValues={companyToFormValues(editingCompany)}
          onCancel={() => setEditingCompany(null)}
          onSubmit={async (values) => {
            const ok = await updateCompany(editingCompany.id, values);
            if (ok) setEditingCompany(null);
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
    </div>
  );
}
