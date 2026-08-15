"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { useEvents } from "@/lib/events-context";
import type { Company } from "@/lib/companies";
import { dateKeyOf, diffInDays, todayKey } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import { createClient } from "@/lib/supabase/client";
import CompanyCreateForm from "@/components/CompanyCreateForm";
import LoadingState from "@/components/ui/LoadingState";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useToast } from "@/components/ui/Toast";
import TodayChecklistCard from "@/components/dashboard/TodayChecklist";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import UpcomingSchedule from "@/components/dashboard/UpcomingSchedule";
import WeeklyProgress from "@/components/dashboard/WeeklyProgress";
import FocusCompanies from "@/components/dashboard/FocusCompanies";
import PipelineOverview from "@/components/dashboard/PipelineOverview";
import type { AppEvent } from "@/lib/events";
import type { ApplicationStep } from "@/lib/applicationSteps";

const INTERVIEW_STEP_KEYS = new Set(["interview_1", "interview_2", "interview_final"]);
const DEADLINE_SOON_DAYS = 3;
const DELTA_WINDOW_DAYS = 6;

// Date.now()/new Date()는 렌더 함수 밖의 순수 함수 안에서만 호출해
// react-hooks/purity(렌더 중 impure 함수 직접 호출 금지) 규칙을 지킨다.
function countInterviewScheduled(events: AppEvent[], steps: ApplicationStep[]): number {
  const now = Date.now();
  return events.filter((event) => {
    if (event.eventType !== "schedule" || event.startsAt === null) return false;
    if (new Date(event.startsAt).getTime() < now) return false;
    const step = steps.find((s) => s.id === event.applicationStepId);
    return step?.stepKey !== undefined && step?.stepKey !== null && INTERVIEW_STEP_KEYS.has(step.stepKey);
  }).length;
}

function countDeadlineSoon(events: AppEvent[], today: string): number {
  const now = Date.now();
  return events.filter((event) => {
    if (event.eventType !== "deadline" || event.dueAt === null) return false;
    if (new Date(event.dueAt).getTime() < now) return false;
    const diff = diffInDays(today, dateKeyOf(event.dueAt));
    return diff <= DEADLINE_SOON_DAYS;
  }).length;
}

// docs/stitch의 KPI 증감 뱃지("+2" 등)에 대응하는 실데이터. 지난 7일 이내 생성된
// in_progress 기업 수(엔트리 증가분)로 계산한다. 정확한 "주간 증감" 정의(예: 상태
// 변경 이력)는 별도 트래킹이 없어 만들 수 없으므로, 가장 근접한 실제 신호만 쓴다.
function countCreatedWithinDays(companies: Company[], today: string, days: number): number {
  return companies.filter((c) => {
    const diff = diffInDays(c.createdAt, today);
    return diff >= 0 && diff <= days;
  }).length;
}

// 내정(offer) 상태 변경 이력은 별도로 남지 않아, 가장 근접한 실제 신호인 updatedAt을
// 대신 쓴다(다른 필드 수정으로도 갱신될 수 있어 완벽히 정확하지는 않음).
function countOfferUpdatedWithinDays(companies: Company[], today: string, days: number): number {
  return companies.filter((c) => {
    if (c.overallStatus !== "offer") return false;
    const diff = diffInDays(c.updatedAt, today);
    return diff >= 0 && diff <= days;
  }).length;
}

export default function DashboardPage() {
  const t = useT();
  const router = useRouter();
  const { showToast } = useToast();
  const { companies, addCompany, loading: companiesLoading, error } = useCompanies();
  const { steps, loading: stepsLoading, refresh: refreshSteps } = useApplicationSteps();
  const { events, loading: eventsLoading } = useEvents();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const loading = companiesLoading || stepsLoading || eventsLoading;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const name = user?.user_metadata?.display_name;
      if (typeof name === "string" && name.trim()) {
        setDisplayName(name);
      }
    });
  }, []);

  const today = todayKey();

  const entryInProgressCount = companies.filter((c) => c.overallStatus === "in_progress").length;
  const interviewScheduledCount = countInterviewScheduled(events, steps);
  const offerCount = companies.filter((c) => c.overallStatus === "offer").length;
  const deadlineSoonCount = countDeadlineSoon(events, today);
  const entryDelta = countCreatedWithinDays(companies, today, DELTA_WINDOW_DAYS);
  const offerDelta = countOfferUpdatedWithinDays(companies, today, DELTA_WINDOW_DAYS);

  if (loading) {
    return (
      <div className="min-h-screen bg-stitch-bg min-[1600px]:min-h-full">
        <div className="mx-auto max-w-[880px] px-6 pb-6 pt-14">
          <LoadingState>{t("dashboard.loading")}</LoadingState>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stitch-bg min-[1600px]:min-h-full">
      <div className="mx-auto max-w-[880px] px-6 pb-6 pt-14 font-[family-name:var(--font-hanken-grotesk)] font-[350] tracking-[-0.025em] text-stitch-ink">
        <section className="mb-4 flex flex-col gap-14">
          <div className="flex w-full items-start justify-between">
            <div>
              <h2 className="mb-2 text-[36px] font-[400] leading-[1.2] tracking-tight text-stitch-ink">
                {displayName
                  ? t("dashboard.greeting", { name: displayName })
                  : t("dashboard.greetingGeneric")}
              </h2>
              <p className="text-[16px] text-secondary">{t("dashboard.description")}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex h-fit items-center gap-1 rounded-stitch-xl bg-primary-navy px-4 py-2 text-[12px] font-[400] text-white shadow-sm transition-all hover:opacity-90"
            >
              <MaterialIcon name="add" size={16} />
              {t("dashboard.addCompany")}
            </button>
          </div>

          <div className="flex w-full gap-16">
            <div className="flex min-w-[80px] flex-col gap-1">
              <span className="text-[13px] font-[400] text-secondary">
                {t("dashboard.kpi.entryInProgress")}
              </span>
              <div className="flex items-end gap-2">
                <span className="text-[36px] font-[400] leading-none tracking-tight text-stitch-ink">
                  {entryInProgressCount}
                </span>
                {entryDelta > 0 && (
                  <span className="mb-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[11px] font-[400] text-success">
                    +{entryDelta}
                  </span>
                )}
              </div>
            </div>
            <div className="flex min-w-[80px] flex-col gap-1">
              <span className="text-[13px] font-[400] text-secondary">
                {t("dashboard.kpi.interviewScheduled")}
              </span>
              <span className="text-[36px] font-[400] leading-none tracking-tight text-stitch-ink">
                {interviewScheduledCount}
              </span>
            </div>
            <div className="flex min-w-[80px] flex-col gap-1">
              <span className="text-[13px] font-[400] text-secondary">{t("dashboard.kpi.offer")}</span>
              <div className="flex items-end gap-2">
                <span className="text-[36px] font-[400] leading-none tracking-tight text-success">
                  {offerCount}
                </span>
                {offerDelta > 0 && (
                  <span className="mb-1 rounded-full bg-success/10 px-1.5 py-0.5 text-[11px] font-[400] text-success">
                    +{offerDelta}
                  </span>
                )}
              </div>
            </div>

            <div className="mx-2 h-14 w-px shrink-0 self-center bg-border" />

            <div className="flex min-w-[80px] flex-col gap-1">
              <div className="flex items-center gap-1">
                <MaterialIcon name="schedule" size={16} className="text-secondary" />
                <span className="text-[13px] font-[400] text-secondary">
                  {t("dashboard.kpi.deadlineSoon")}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-[36px] font-[400] leading-none tracking-tight text-[#f97316]">
                  {deadlineSoonCount}
                </span>
                <span className="mb-1 text-[11px] font-[400] text-secondary">
                  {t("dashboard.kpi.deadlineSoonSubtext", { days: DEADLINE_SOON_DAYS })}
                </span>
              </div>
            </div>
          </div>
        </section>

        <WeeklyProgress events={events} />

        {error && (
          <p className="mb-3 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        {/* docs/stitch/.../code.html은 grid-cols-[1fr_1fr_1.5fr]이지만, 가운데 카드(本日の予定)
            헤더 행에 truncate/min-w-0가 없어 실제 렌더링(screen.png)에서는 1:1:1.5가 아니라
            약 255:290:260으로 밀린다. screen.png를 기준값으로 픽셀 실측해 그 비율을 그대로 고정한다. */}
        <div className="mb-3 grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[255fr_290fr_260fr]">
          <TodayChecklistCard companies={companies} events={events} />
          <TodaySchedule companies={companies} events={events} />
          <UpcomingSchedule companies={companies} events={events} steps={steps} />
        </div>

        <div className="grid grid-cols-1 items-stretch gap-3 pb-10 lg:grid-cols-[1.5fr_1fr]">
          <PipelineOverview companies={companies} steps={steps} />
          <FocusCompanies companies={companies} events={events} steps={steps} />
        </div>

        {isAddOpen && (
          <CompanyCreateForm
            title={t("dashboard.addCompanyModalTitle")}
            description={t("companies.list.addCompanyModalDescription")}
            onCancel={() => setIsAddOpen(false)}
            onSubmit={async (values) => {
              const created = await addCompany(values);
              if (created) {
                setIsAddOpen(false);
                refreshSteps();
                showToast(t("companies.list.addSuccessToast", { name: values.name }));
                // 이름만 입력하고 나머지는 비어 있는 상태라, 바로 상세 화면으로 이동해
                // 이어서 채울 수 있게 한다.
                router.push(`/companies/${created.id}`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
