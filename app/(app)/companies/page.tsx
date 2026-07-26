"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import CompanyForm from "@/components/CompanyForm";
import { COMPANY_STATUSES, STEP_TYPES, PRIORITIES, createEmptyCompanyFormValues } from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";

const ALL = "전체";

export default function CompaniesPage() {
  const { companies, addCompany, loading, error } = useCompanies();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [stepFilter, setStepFilter] = useState<string>(ALL);
  const [isAddOpen, setIsAddOpen] = useState(false);

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

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === ALL || company.status === statusFilter;
    const matchesPriority = priorityFilter === ALL || company.priority === priorityFilter;
    const matchesStep = stepFilter === ALL || company.currentStep === stepFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesStep;
  });

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">기업 관리</h1>
        <p className="mt-1 text-sm text-secondary">
          지원한 기업을 한눈에 확인하고 관리하세요.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="기업명 검색"
          className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground placeholder:text-secondary focus:border-primary focus:outline-none sm:w-56"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value={ALL}>전체 상태</option>
          {COMPANY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-10 rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value={ALL}>전체 우선순위</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <select
          value={stepFilter}
          onChange={(e) => setStepFilter(e.target.value)}
          className="h-10 rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        >
          <option value={ALL}>전체 단계</option>
          {STEP_TYPES.map((step) => (
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
            초기화
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="h-10 rounded-[10px] bg-primary px-4 text-sm font-medium text-white sm:ml-auto"
        >
          기업 추가
        </button>
      </div>

      <p className="mb-4 text-sm text-secondary">
        총 <span className="font-medium text-foreground">{filteredCompanies.length}</span>건
      </p>

      {error && (
        <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-[10px] border border-border bg-card px-6 py-10 text-center text-sm text-secondary">
          불러오는 중입니다...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-border bg-card">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-secondary">
                <th className="px-6 py-3 font-medium">기업명</th>
                <th className="px-6 py-3 font-medium">현재 전형 단계</th>
                <th className="px-6 py-3 font-medium">상태</th>
                <th className="px-6 py-3 font-medium">다음 일정</th>
                <th className="px-6 py-3 font-medium">우선순위</th>
                <th className="px-6 py-3 font-medium">최종 수정일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="cursor-pointer hover:bg-background">
                  <td className="px-6 py-3 font-medium">
                    <Link href={`/companies/${company.id}`} className="text-primary hover:underline">
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-foreground">{company.currentStep}</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={company.status} />
                  </td>
                  <td className="px-6 py-3 text-secondary">
                    {company.nextSchedule ?? "예정 없음"}
                  </td>
                  <td className="px-6 py-3 text-foreground">{company.priority}</td>
                  <td className="px-6 py-3 text-secondary">{company.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCompanies.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-secondary">
              검색 조건에 맞는 기업이 없습니다
            </p>
          )}
        </div>
      )}

      {isAddOpen && (
        <CompanyForm
          title="기업 추가"
          initialValues={createEmptyCompanyFormValues()}
          onCancel={() => setIsAddOpen(false)}
          onSubmit={async (values) => {
            const ok = await addCompany(values);
            if (ok) setIsAddOpen(false);
          }}
        />
      )}
    </div>
  );
}
