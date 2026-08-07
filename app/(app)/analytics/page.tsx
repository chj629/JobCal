"use client";

import { Award, Briefcase, CalendarDays, CheckCircle2 } from "lucide-react";
import { useCompanies } from "@/lib/companies-context";
import { useEvents } from "@/lib/events-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { dateKeyOf, todayKey } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import StatusDonutChart from "@/components/analytics/StatusDonutChart";
import StepFunnelChart from "@/components/analytics/StepFunnelChart";
import CompanyTrendChart from "@/components/analytics/CompanyTrendChart";
import UpcomingEventsCard from "@/components/analytics/UpcomingEventsCard";
import ResultSummaryCard from "@/components/analytics/ResultSummaryCard";

// 11_analytics.png Step 1: KPI 4개만 우선 구현한다. 전월비/통과율/날짜 범위/차트/엑스포트는
// 이력 데이터나 새 라이브러리가 필요해 이번 Step 범위에서 제외한다(분석 문서 참고).
export default function AnalyticsPage() {
  const t = useT();
  const { companies, loading: companiesLoading, error } = useCompanies();
  const { events, loading: eventsLoading } = useEvents();
  const { steps, loading: stepsLoading } = useApplicationSteps();
  const loading = companiesLoading || eventsLoading || stepsLoading;

  const today = todayKey();

  // 대시보드 KPI(app/(app)/page.tsx)와 동일한 계산 기준을 그대로 재사용한다.
  const inProgressCount = companies.filter((c) => c.overallStatus === "in_progress").length;
  const upcomingEventCount = events.filter((event) => {
    const at = event.startsAt ?? event.dueAt;
    return at !== null && dateKeyOf(at) >= today;
  }).length;
  const offerCount = companies.filter((c) => c.overallStatus === "offer").length;
  const joinedCount = companies.filter((c) => c.overallStatus === "joined").length;
  const rejectedCount = companies.filter((c) => c.overallStatus === "rejected").length;
  const completedSelectionCount = offerCount + joinedCount + rejectedCount;

  const kpiTiles = [
    {
      label: t("dashboard.kpi.inProgress"),
      value: inProgressCount,
      icon: Briefcase,
      colorClass: "bg-primary/10 text-primary",
    },
    {
      label: t("dashboard.kpi.completedSelection"),
      value: completedSelectionCount,
      icon: CheckCircle2,
      colorClass: "bg-joined/10 text-joined",
    },
    {
      label: t("dashboard.kpi.upcoming"),
      value: upcomingEventCount,
      icon: CalendarDays,
      colorClass: "bg-success/10 text-success",
    },
    {
      label: t("companies.list.status.offer"),
      value: offerCount,
      icon: Award,
      colorClass: "bg-warning/10 text-warning",
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-[1320px] px-7 pt-7 pb-8 text-sm text-secondary">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] px-7 pt-7 pb-8">
      <header className="mb-8">
        <h1 className="text-[24px] font-bold text-foreground">{t("analytics.title")}</h1>
        <p className="mt-1 text-sm text-secondary">{t("analytics.description")}</p>
      </header>

      {error && (
        <p className="mb-6 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpiTiles.map(({ label, value, icon: Icon, colorClass }) => (
          <div
            key={label}
            className="flex h-[164px] flex-col rounded-[10px] border border-border bg-card p-6"
          >
            <div className="flex items-start gap-3">
              <span
                className={
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-full " + colorClass
                }
              >
                <Icon size={24} />
              </span>
              <div className="flex flex-col gap-2">
                <span className="text-[16px] font-bold text-secondary">{label}</span>
                <p className="text-[38px] font-bold text-foreground">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 11_analytics.png 기준 데스크톱 다단 그리드: 상태 도넛/전형 퍼널, 응모 추이/향후 일정을
          각각 한 행에 배치하고, 선고 결과 서머리는 전체 폭으로 마지막에 둔다. 미만에서는
          grid-cols-1로 모두 세로 1열 스택된다.
          응모 추이 차트는 min-w-[600px] SVG를 그대로 쓰므로, 사이드바(240px)를 뺀 실제 폭이
          2열 모두 600px 이상을 확보하려면 최소 1224px가 필요하다. lg/xl에서는 이 폭을
          확보하지 못해 항상 카드 내부 가로 스크롤이 생기므로, 실측 기준으로 맞아떨어지는
          1600px에서 전환한다(calendar/page.tsx와 동일 breakpoint). */}
      <div className="mt-6 grid grid-cols-1 gap-6 min-[1600px]:grid-cols-2 min-[1600px]:items-start">
        <StatusDonutChart companies={companies} />
        <StepFunnelChart companies={companies} steps={steps} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 min-[1600px]:grid-cols-2 min-[1600px]:items-start">
        <CompanyTrendChart companies={companies} />
        <UpcomingEventsCard companies={companies} events={events} steps={steps} />
      </div>

      <div className="mt-6">
        <ResultSummaryCard companies={companies} />
      </div>
    </div>
  );
}
