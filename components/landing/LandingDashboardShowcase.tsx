"use client";

import { useT } from "@/lib/locale-context";
import { buildShowcaseMockData } from "@/components/landing/landingShowcaseMockData";
import type { AppEvent } from "@/lib/events";
import type { ApplicationStep } from "@/lib/applicationSteps";
import TodayChecklistCard from "@/components/dashboard/TodayChecklist";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import UpcomingSchedule from "@/components/dashboard/UpcomingSchedule";
import PipelineOverview from "@/components/dashboard/PipelineOverview";
import FocusCompanies from "@/components/dashboard/FocusCompanies";
import MaterialIcon from "@/components/ui/MaterialIcon";
import ScrollReveal from "@/components/landing/ScrollReveal";

const INTERVIEW_STEP_KEYS = new Set(["interview_1", "interview_2", "interview_final"]);
const DEADLINE_SOON_MS = 3 * 24 * 60 * 60 * 1000;

// Date.now()/new Date()는 렌더 함수 밖의 순수 함수 안에서만 호출해
// react-hooks/purity(렌더 중 impure 함수 직접 호출 금지) 규칙을 지킨다 — 실제
// app/(app)/dashboard/page.tsx의 countInterviewScheduled/countDeadlineSoon과 같은 패턴.
function countInterviewScheduled(events: AppEvent[], steps: ApplicationStep[]): number {
  const now = Date.now();
  return events.filter((event) => {
    if (event.eventType !== "schedule" || event.startsAt === null) return false;
    if (new Date(event.startsAt).getTime() < now) return false;
    const step = steps.find((s) => s.id === event.applicationStepId);
    return step?.stepKey !== null && step?.stepKey !== undefined && INTERVIEW_STEP_KEYS.has(step.stepKey);
  }).length;
}

function countDeadlineSoon(events: AppEvent[]): number {
  const now = Date.now();
  return events.filter((event) => {
    if (event.eventType !== "deadline" || event.dueAt === null) return false;
    const dueTime = new Date(event.dueAt).getTime();
    return dueTime >= now && dueTime - now <= DEADLINE_SOON_MS;
  }).length;
}

// 56차: Hero 아래 첫 product showcase 섹션. app/(app)/dashboard/page.tsx가 실제로 쓰는
// 카드 컴포넌트(TodayChecklistCard/TodaySchedule/UpcomingSchedule/PipelineOverview/
// FocusCompanies)를 그대로 재사용하고, KPI 행만 그 페이지의 마크업/클래스를 그대로
// 옮겨 목업 수치로 다시 그렸다(KPI 자체는 페이지 밖에서 재사용 가능한 컴포넌트가 아니라
// page.tsx에 인라인되어 있어서). WeeklyProgress는 대시보드가 실사용자의
// event_completions(체크 여부)에 의존해 비로그인 방문자에게는 항상 0%로만 보여
// "제품이 텅 비어 보이는" 역효과가 나서 이 쇼케이스에서는 뺐다 — 나머지 카드는 체크
// 여부와 무관하게(빈 체크박스 상태) 그 자체로 정상적인 화면이라 그대로 둔다.
export default function LandingDashboardShowcase() {
  const t = useT();
  const { companies, steps, events } = buildShowcaseMockData(t);

  const entryInProgressCount = companies.filter((c) => c.overallStatus === "in_progress").length;
  const offerCount = companies.filter((c) => c.overallStatus === "offer").length;
  const interviewScheduledCount = countInterviewScheduled(events, steps);
  const deadlineSoonCount = countDeadlineSoon(events);

  return (
    <section id="ai" className="bg-white px-6 py-24 md:px-12 md:py-32">
      <ScrollReveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-[34px] leading-[1.3] font-[500] tracking-tight break-keep text-neutral-900 sm:text-[44px]">
          {t("landing.showcase.dashboard.title")}
        </h2>
        <p className="mt-5 whitespace-pre-line text-[16px] leading-[1.7] break-keep text-neutral-500 sm:text-[18px]">
          {t("landing.showcase.dashboard.description")}
        </p>
      </ScrollReveal>

      <ScrollReveal className="mx-auto mt-16 max-w-[1200px]">
        <div className="rounded-stitch-2xl border border-stitch-border bg-stitch-bg p-6 shadow-xl sm:p-10">
          <div className="mx-auto max-w-[880px] font-[family-name:var(--font-hanken-grotesk)] font-[350] tracking-[-0.025em] text-stitch-ink">
            <div className="mb-6 flex w-full flex-wrap gap-x-10 gap-y-4">
              <div className="flex min-w-[80px] flex-col gap-1">
                <span className="text-[13px] font-[400] text-secondary">
                  {t("dashboard.kpi.entryInProgress")}
                </span>
                <span className="text-[36px] font-[400] leading-none tracking-tight text-stitch-ink">
                  {entryInProgressCount}
                </span>
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
                <span className="text-[36px] font-[400] leading-none tracking-tight text-success">
                  {offerCount}
                </span>
              </div>

              <div className="mx-2 hidden h-14 w-px shrink-0 self-center bg-border sm:block" />

              <div className="flex min-w-[80px] flex-col gap-1">
                <div className="flex items-center gap-1">
                  <MaterialIcon name="schedule" size={16} className="text-secondary" />
                  <span className="text-[13px] font-[400] text-secondary">
                    {t("dashboard.kpi.deadlineSoon")}
                  </span>
                </div>
                <span className="text-[36px] font-[400] leading-none tracking-tight text-[#f97316]">
                  {deadlineSoonCount}
                </span>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[255fr_290fr_260fr]">
              <TodayChecklistCard companies={companies} events={events} />
              <TodaySchedule companies={companies} events={events} />
              <UpcomingSchedule companies={companies} events={events} steps={steps} />
            </div>

            <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1.5fr_1fr]">
              <PipelineOverview companies={companies} steps={steps} />
              <FocusCompanies companies={companies} events={events} steps={steps} />
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
