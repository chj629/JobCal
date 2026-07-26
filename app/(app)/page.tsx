"use client";

import Link from "next/link";
import SummaryCard from "@/components/SummaryCard";
import StatusBadge from "@/components/StatusBadge";
import { useCompanies } from "@/lib/companies-context";
import type { Company } from "@/lib/companies";

const TODAY_LABEL = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
}).format(new Date());

export default function DashboardPage() {
  const { companies, loading, error } = useCompanies();

  const todayKey = new Date().toISOString().slice(0, 10);

  const summary = {
    total: companies.length,
    inProgress: companies.filter((c) => c.status === "진행 중").length,
    offer: companies.filter((c) => c.status === "내정").length,
    rejected: companies.filter((c) => c.status === "불합격").length,
  };

  const upcomingSchedules = companies
    .filter(
      (c): c is Company & { nextSchedule: string } =>
        c.nextSchedule !== null && c.nextSchedule >= todayKey
    )
    .sort((a, b) => (a.nextSchedule < b.nextSchedule ? -1 : 1));

  const recentCompanies = [...companies].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-8 py-8 text-sm text-secondary">
        불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">대시보드</h1>
        <p className="mt-1 text-sm text-secondary">{TODAY_LABEL}</p>
      </header>

      {error && (
        <p className="mb-8 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <section className="mb-8 grid grid-cols-4 gap-4">
        <SummaryCard label="전체 기업" value={summary.total} />
        <SummaryCard label="진행 중" value={summary.inProgress} />
        <SummaryCard label="내정" value={summary.offer} />
        <SummaryCard label="불합격" value={summary.rejected} />
      </section>

      <section className="mb-8 rounded-[10px] border border-border bg-card">
        <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
          다가오는 일정
        </h2>
        {upcomingSchedules.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-secondary">
            다가오는 일정이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {upcomingSchedules.map((company) => (
              <li key={company.id}>
                <Link
                  href={`/companies/${company.id}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-background"
                >
                  <span className="text-sm font-medium text-foreground">{company.name}</span>
                  <span className="text-sm text-secondary">{company.currentStep}</span>
                  <span className="ml-auto text-sm text-secondary">{company.nextSchedule}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[10px] border border-border bg-card">
        <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
          최근 지원 기업
        </h2>
        {recentCompanies.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-secondary">
            등록된 기업이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recentCompanies.map((company) => (
              <li key={company.id}>
                <Link
                  href={`/companies/${company.id}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-background"
                >
                  <span className="flex-1 text-sm font-medium text-foreground">
                    {company.name}
                  </span>
                  <span className="text-sm text-secondary">{company.currentStep}</span>
                  <StatusBadge status={company.status} />
                  <span className="w-24 text-right text-sm text-secondary">
                    {company.updatedAt}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
