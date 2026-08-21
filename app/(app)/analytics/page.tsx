"use client";

import { useCompanies } from "@/lib/companies-context";
import { useEvents } from "@/lib/events-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { useT } from "@/lib/locale-context";
import LoadingState from "@/components/ui/LoadingState";
import StatusDonutChart from "@/components/analytics/StatusDonutChart";
import StepFunnelChart from "@/components/analytics/StepFunnelChart";
import CompanyTrendChart from "@/components/analytics/CompanyTrendChart";
import UpcomingEventsCard from "@/components/analytics/UpcomingEventsCard";
import ResultSummaryCard from "@/components/analytics/ResultSummaryCard";
import MonthlyActivityCard from "@/components/analytics/MonthlyActivityCard";
import DeadlineRiskCard from "@/components/analytics/DeadlineRiskCard";
import StalledCompaniesCard from "@/components/analytics/StalledCompaniesCard";
import PriorityBreakdownCard from "@/components/analytics/PriorityBreakdownCard";

// docs/stitch/메인페이지 5개/jobcal_analytics_standardized_design_refresh에는
// "今後の予定" 카드가 없다(2x2 그리드: 상태 도넛/선고 스텝, 응모 추이/선고 결과). 기존
// 로직/컴포넌트는 그대로 두고 기본 화면에서만 숨긴다.
const SHOW_UPCOMING_EVENTS_CARD = false;

export default function AnalyticsPage() {
  const t = useT();
  const { companies, loading: companiesLoading, error: companiesError } = useCompanies();
  const { events, loading: eventsLoading, error: eventsError } = useEvents();
  const { steps, loading: stepsLoading, error: stepsError } = useApplicationSteps();
  const loading = companiesLoading || eventsLoading || stepsLoading;
  // Dashboard/Companies/Calendar와 동일한 이유 — 세 Context 중 하나라도 실패하면 배너
  // 1개만 보여준다.
  const hasLoadError = !!(companiesError || eventsError || stepsError);

  const totalCount = companies.length;
  const inProgressCount = companies.filter((c) => c.overallStatus === "in_progress").length;
  const offerCount = companies.filter((c) => c.overallStatus === "offer").length;
  const offerRate = totalCount > 0 ? Math.round((offerCount / totalCount) * 1000) / 10 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-stitch-bg min-[1600px]:min-h-full">
        <div className="mx-auto max-w-[1200px] px-6 pb-6 pt-14">
          <LoadingState>{t("common.loading")}</LoadingState>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stitch-bg min-[1600px]:min-h-full">
      <div className="mx-auto max-w-[1200px] px-6 pb-6 pt-14 font-[family-name:var(--font-hanken-grotesk)] font-[350] tracking-[-0.025em] text-stitch-ink">
        <div className="mb-8 flex flex-col gap-4">
          <div>
            <h1 className="mb-1.5 text-[36px] font-[400] leading-[1.2] tracking-tight text-stitch-ink">
              {t("analytics.title")}
            </h1>
            <p className="text-[16px] text-secondary">{t("analytics.description")}</p>
          </div>

          {hasLoadError && (
            <p className="rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {t("common.dataLoadFailed")}
            </p>
          )}

          <div className="flex w-full flex-wrap items-center gap-8 pt-2">
            <div className="flex min-w-[80px] flex-col gap-1">
              <span className="text-[13px] font-[400] tracking-normal text-secondary">
                {t("analytics.kpi.totalCompanies")}
              </span>
              <span className="text-[36px] font-[400] leading-none tracking-tight text-stitch-ink">
                {totalCount}
              </span>
            </div>
            <div className="flex min-w-[80px] flex-col gap-1">
              <span className="text-[13px] font-[400] tracking-normal text-secondary">
                {t("companies.list.status.inProgress")}
              </span>
              <span className="text-[36px] font-[400] leading-none tracking-tight text-stitch-ink">
                {inProgressCount}
              </span>
            </div>
            <div className="flex min-w-[80px] flex-col gap-1">
              <span className="text-[13px] font-[400] tracking-normal text-secondary">
                {t("companies.list.status.offer")}
              </span>
              <span className="text-[36px] font-[400] leading-none tracking-tight text-success">
                {offerCount}
              </span>
            </div>
            <div className="mx-2 h-14 w-px shrink-0 self-center bg-stitch-border" />
            <div className="flex min-w-[80px] flex-col gap-1">
              <span className="text-[13px] font-[400] tracking-normal text-secondary">
                {t("analytics.kpi.offerRate")}
              </span>
              <span className="text-[36px] font-[400] leading-none tracking-tight text-stitch-ink">
                {offerRate}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 @min-[960px]/main:grid-cols-2">
          <StatusDonutChart companies={companies} />
          <StepFunnelChart companies={companies} steps={steps} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 @min-[960px]/main:grid-cols-2">
          <CompanyTrendChart companies={companies} />
          <ResultSummaryCard companies={companies} steps={steps} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 @min-[960px]/main:grid-cols-2">
          <MonthlyActivityCard companies={companies} events={events} />
          <DeadlineRiskCard companies={companies} events={events} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 @min-[960px]/main:grid-cols-2">
          <StalledCompaniesCard companies={companies} steps={steps} />
          <PriorityBreakdownCard companies={companies} />
        </div>

        {SHOW_UPCOMING_EVENTS_CARD && (
          <div className="mt-3">
            <UpcomingEventsCard companies={companies} events={events} steps={steps} />
          </div>
        )}
      </div>
    </div>
  );
}
