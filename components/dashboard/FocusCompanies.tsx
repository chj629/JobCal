"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Company } from "@/lib/companies";
import { getCurrentStep, getStepDisplayName, type ApplicationStep } from "@/lib/applicationSteps";
import { getNextEvent, type AppEvent } from "@/lib/events";
import {
  diffInDaysInAsiaTokyo,
  formatDateKeyInAsiaTokyo,
  formatTimeOfDayInAsiaTokyo,
  todayKeyInAsiaTokyo,
} from "@/lib/date";
import { useT } from "@/lib/locale-context";
import EmptyState from "@/components/ui/EmptyState";
import MaterialIcon from "@/components/ui/MaterialIcon";
import ScrollFade from "@/components/ui/ScrollFade";
import { useScrollFade } from "@/lib/useScrollFade";

interface FocusCompaniesProps {
  companies: Company[];
  events: AppEvent[];
  steps: ApplicationStep[];
}

const MAX_ROWS = 5;

function formatRelativeTime(iso: string, t: (key: string) => string): string {
  const key = formatDateKeyInAsiaTokyo(iso);
  const diff = diffInDaysInAsiaTokyo(todayKeyInAsiaTokyo(), key);
  const dayLabel =
    diff === 0 ? t("dashboard.today") : diff === 1 ? t("dashboard.tomorrow") : key.slice(5).replace("-", ".");
  return `${dayLabel} ${formatTimeOfDayInAsiaTokyo(iso)}`;
}

// docs/stitch/메인페이지 5개/jobcal_dashboard_added_weekly_progress_summary의 "注目企業" 카드.
// 진행 중(in_progress)이거나 내정(offer) 상태라 아직 사용자의 결정/행동이 남은 기업을,
// 다음 일정이 임박한 순으로 보여준다. 기업명/현재 전형/다음 일정 계산은 companies/page.tsx가
// 쓰는 것과 동일한 기존 로직(getCurrentStep, getNextEvent)만 재사용한다.
export default function FocusCompanies({ companies, events, steps }: FocusCompaniesProps) {
  const t = useT();
  const router = useRouter();
  const focused = companies
    .filter((company) => company.overallStatus === "in_progress" || company.overallStatus === "offer")
    .map((company) => {
      const companySteps = steps.filter((step) => step.companyId === company.id);
      const companyEvents = events.filter((event) => event.companyId === company.id);
      const nextEvent = getNextEvent(companyEvents);
      const nextEventAt = nextEvent ? (nextEvent.startsAt ?? nextEvent.dueAt) : null;
      const currentStep = getCurrentStep(companySteps);
      return {
        company,
        currentStepName: currentStep ? getStepDisplayName(currentStep, t) : t("dashboard.noStepLabel"),
        nextEventAt,
      };
    })
    .sort((a, b) => {
      if (!a.nextEventAt && !b.nextEventAt) return 0;
      if (!a.nextEventAt) return 1;
      if (!b.nextEventAt) return -1;
      return new Date(a.nextEventAt).getTime() - new Date(b.nextEventAt).getTime();
    })
    .slice(0, MAX_ROWS);

  const { scrollRef, canScrollDown, onScroll } = useScrollFade([focused.length]);

  return (
    <div className="flex h-[320px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <h3 className="mb-3 flex shrink-0 items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="push_pin" size={17} className="text-secondary" />
        {t("dashboard.focusCompanies.title")}
      </h3>

      {focused.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon="apartment"
            title={t("dashboard.focusCompanies.emptyTitle")}
            description={t("dashboard.focusCompanies.emptySubtitle")}
          />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full space-y-1.5 overflow-y-auto overflow-x-hidden stitch-scrollbar-hidden pr-1"
        >
          {focused.map(({ company, currentStepName, nextEventAt }) => (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="-mx-2 flex flex-col gap-1.5 rounded-stitch-xl p-2 transition-colors hover:bg-black/[0.015]"
            >
              <p className="truncate text-[14px] font-[400] text-stitch-ink">{company.name}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-stitch-md border border-stitch-border bg-background px-2 py-0.5 text-[11px] text-secondary">
                  {currentStepName}
                </span>
                {company.overallStatus === "offer" ? (
                  <span className="rounded-stitch-md bg-primary-navy px-2 py-0.5 text-[11px] font-[400] text-white">
                    {t("companies.list.status.offer")}
                  </span>
                ) : (
                  nextEventAt && (
                    <span className="rounded-stitch-md border border-stitch-border bg-background px-2 py-0.5 text-[11px] text-secondary">
                      {formatRelativeTime(nextEventAt, t)}
                    </span>
                  )
                )}
              </div>
            </Link>
          ))}
        </div>
        <ScrollFade visible={canScrollDown} />
        </div>
      )}

      <div className="mt-2 flex shrink-0 justify-end">
        <button
          type="button"
          onClick={() => router.push("/companies")}
          className="flex items-center gap-0.5 text-[12px] font-[400] text-primary-navy transition-colors hover:opacity-80"
        >
          {t("dashboard.focusCompanies.viewAll")}
          <MaterialIcon name="chevron_right" size={15} />
        </button>
      </div>
    </div>
  );
}
