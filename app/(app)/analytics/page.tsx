"use client";

import { Award, Briefcase, CalendarDays, CheckCircle2 } from "lucide-react";
import { useCompanies } from "@/lib/companies-context";
import { useEvents } from "@/lib/events-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { dateKeyOf, todayKey } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import LoadingState from "@/components/ui/LoadingState";
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
      <div className="mx-auto max-w-[1200px] px-8 py-8">
        <LoadingState>{t("common.loading")}</LoadingState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">{t("analytics.title")}</h1>
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
          2단 전환은 뷰포트가 아니라 app/(app)/layout.tsx의 <main @container/main> 실제 폭을
          기준으로 한다(AI Drawer가 push로 열려 main이 좁아지면 자동 1단 유지, 닫히면 자동
          2단 복귀 — calendar/page.tsx와 동일한 컨테이너 쿼리 방식).
          2열 각각이 CompanyTrendChart.tsx의 min-w-[600px](1600px 미만 구간의 값, 이번에
          손대지 않음)를 스크롤 없이 담으려면 main이 최소 600*2+gap-6(24)+px-8(64)=1288px
          있어야 하므로, calendar/page.tsx와 동일하게 여유를 둔 1320px를 기준으로 삼는다.
          이 기준을 넘기면 열 폭은 항상 (1320-64-24)/2=616px 이상이라, 뷰포트가 아직
          1600px 미만이라 CompanyTrendChart.tsx가 아직 600px 값을 쓰는 경우까지 포함해
          항상 안전하다(뷰포트가 1600px를 넘어 자체적으로 480px로 낮아지면 여유는 더 커짐). */}
      <div className="mt-6 grid grid-cols-1 gap-6 @min-[1320px]/main:grid-cols-2 @min-[1320px]/main:items-start">
        <StatusDonutChart companies={companies} />
        <StepFunnelChart companies={companies} steps={steps} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 @min-[1320px]/main:grid-cols-2 @min-[1320px]/main:items-start">
        <CompanyTrendChart companies={companies} />
        <UpcomingEventsCard companies={companies} events={events} steps={steps} />
      </div>

      <div className="mt-6">
        <ResultSummaryCard companies={companies} />
      </div>
    </div>
  );
}
