"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, MoreHorizontal } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import CompanyForm from "@/components/CompanyForm";
import {
  OVERALL_STATUSES,
  PRIORITIES,
  createEmptyCompanyFormValues,
  companyToFormValues,
  type Company,
} from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { DEFAULT_STEP_NAMES, getCurrentStep } from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import { getNextEvent } from "@/lib/events";
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

// design.md 색상 토큰 재사용: 높음=Error, 보통=Warning, 낮음=Success
const PRIORITY_BADGE_CLASS: Record<string, string> = {
  high: "bg-error/10 text-error",
  medium: "bg-warning/10 text-warning",
  low: "bg-success/10 text-success",
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
  const { events, loading: eventsLoading } = useEvents();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [stepFilter, setStepFilter] = useState<string>(ALL);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);

  const loading = companiesLoading || stepsLoading || eventsLoading;

  // application_steps/events를 직접 사용해 기업별 "현재 전형", "다음 일정"을 계산한다.
  const companyRows = companies.map((company) => {
    const companySteps = steps.filter((step) => step.companyId === company.id);
    const companyEvents = events.filter((event) => event.companyId === company.id);
    const nextEvent = getNextEvent(companyEvents);
    const nextEventAt = nextEvent ? (nextEvent.startsAt ?? nextEvent.dueAt) : null;
    const nextEventStepName = nextEvent
      ? (companySteps.find((s) => s.id === nextEvent.applicationStepId)?.name ?? nextEvent.title)
      : null;

    return {
      company,
      currentStepName: getCurrentStep(companySteps)?.name ?? t("dashboard.noStepLabel"),
      nextEventAt,
      nextEventStepName,
    };
  });

  // 상태 탭 건수는 검색/우선순위/전형 필터까지만 반영하고, 상태 자체는 제외해서 계산한다.
  const baseFilteredRows = companyRows.filter(({ company, currentStepName }) => {
    const matchesSearch = company.name
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesPriority = priorityFilter === ALL || company.priority === priorityFilter;
    const matchesStep = stepFilter === ALL || currentStepName === stepFilter;
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

  async function handleDelete(company: Company) {
    setActiveMenuId(null);
    if (window.confirm(t("companies.list.deleteConfirm", { name: company.name }))) {
      await deleteCompany(company.id);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-foreground">
            {t("companies.list.title")}
          </h1>
          <p className="mt-1 text-sm text-secondary">{t("companies.list.description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("companies.list.searchPlaceholder")}
            className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground placeholder:text-secondary focus:border-primary focus:outline-none sm:w-64"
          />
          <button
            type="button"
            onClick={() => setIsFilterOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-background"
          >
            <Filter size={16} />
            {t("companies.list.filterButton")}
          </button>
          <Link
            href="/companies/new-from-email"
            className="flex h-10 items-center rounded-[10px] border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-background"
          >
            {t("companies.list.addFromEmail")}
          </Link>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="h-10 rounded-[10px] bg-primary px-4 text-sm font-medium text-white"
          >
            {t("companies.list.addCompany")}
          </button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value={ALL}>{t("companies.list.filters.allPriority")}</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority]}
              </option>
            ))}
          </select>
          <select
            value={stepFilter}
            onChange={(e) => setStepFilter(e.target.value)}
            className="h-10 rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value={ALL}>{t("companies.list.filters.allStep")}</option>
            {DEFAULT_STEP_NAMES.map((step) => (
              <option key={step} value={step}>
                {step}
              </option>
            ))}
          </select>
          {isFiltering && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 rounded-[10px] border border-border px-4 text-sm font-medium text-secondary hover:text-foreground"
            >
              {t("companies.list.filters.reset")}
            </button>
          )}
        </div>
      )}

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
        <div className="rounded-[10px] border border-border bg-card px-6 py-10 text-center text-sm text-secondary">
          {t("companies.list.loading")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-border bg-card">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-secondary">
                <th className="px-6 py-3 font-medium">{t("companies.list.columns.company")}</th>
                <th className="px-6 py-3 font-medium">
                  {t("companies.list.columns.currentStep")}
                </th>
                <th className="px-6 py-3 font-medium">{t("companies.list.columns.status")}</th>
                <th className="px-6 py-3 font-medium">
                  {t("companies.list.columns.nextSchedule")}
                </th>
                <th className="px-6 py-3 font-medium">{t("companies.list.columns.priority")}</th>
                <th className="px-6 py-3 font-medium">
                  {t("companies.list.columns.updatedAt")}
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.map(({ company, currentStepName, nextEventAt, nextEventStepName }) => (
                <tr key={company.id} className="hover:bg-background">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-xs font-semibold text-primary">
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
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                      {currentStepName}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={company.overallStatus} />
                  </td>
                  <td className="px-6 py-3">
                    {nextEventAt ? (
                      <div>
                        <p className="text-foreground">
                          {formatRelativeDate(nextEventAt, t, weekdayLabels)}{" "}
                          {formatTimeOfDay(nextEventAt)}
                        </p>
                        <p className="text-xs text-secondary">{nextEventStepName}</p>
                      </div>
                    ) : (
                      <span className="text-secondary">{t("companies.list.noSchedule")}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
                        PRIORITY_BADGE_CLASS[company.priority]
                      }
                    >
                      {priorityLabels[company.priority]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-secondary">{company.updatedAt}</td>
                  <td className="relative px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuId((id) => (id === company.id ? null : company.id))
                      }
                      className="rounded-[8px] p-1.5 text-secondary hover:bg-background hover:text-foreground"
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
                        <div className="absolute right-4 top-10 z-20 w-32 rounded-[10px] border border-border bg-card py-1 text-left shadow-lg">
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
                            onClick={() => handleDelete(company)}
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
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-secondary">
                    {t("companies.list.empty.noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
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
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-secondary hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
                      "flex h-8 w-8 items-center justify-center rounded-[8px] text-sm font-medium " +
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
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-secondary hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={t("companies.list.pagination.next")}
                >
                  ›
                </button>
              </div>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-9 rounded-[8px] border border-border bg-card px-2 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {t("companies.list.pagination.perPage", { size })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
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
    </div>
  );
}
