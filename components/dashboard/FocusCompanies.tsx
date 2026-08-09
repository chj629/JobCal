"use client";

import Link from "next/link";
import { Building2, Info } from "lucide-react";
import type { Company } from "@/lib/companies";
import { getCurrentStep, getStepDisplayName, type ApplicationStep } from "@/lib/applicationSteps";
import { getNextEvent, type AppEvent } from "@/lib/events";
import { diffInDays, dateKeyOf, todayKey, formatTimeOfDay } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

interface FocusCompaniesProps {
  companies: Company[];
  events: AppEvent[];
  steps: ApplicationStep[];
}

const MAX_ROWS = 5;

// companies/page.tsx의 PRIORITY_BADGE_VARIANT와 동일한 색 의미를 재사용한다.
const PRIORITY_BADGE_VARIANT: Record<string, BadgeVariant> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

function getInitials(name: string) {
  return name.trim().slice(0, 2);
}

function formatRelativeTime(iso: string, t: (key: string) => string): string {
  const key = dateKeyOf(iso);
  const diff = diffInDays(todayKey(), key);
  const dayLabel =
    diff === 0 ? t("dashboard.today") : diff === 1 ? t("dashboard.tomorrow") : key.slice(5).replace("-", ".");
  return `${dayLabel} ${formatTimeOfDay(iso)}`;
}

// 6_homeAIOFF.png의 "진행 중인 기업" 카드. 우선순위와 무관하게 overallStatus가
// in_progress인 기업을 다음 일정이 임박한 순으로 보여준다. 기업명/현재 전형/다음 일정/
// 우선순위 계산은 companies/page.tsx가 쓰는 것과 동일한 기존 로직(getCurrentStep,
// getNextEvent)만 재사용한다.
export default function FocusCompanies({ companies, events, steps }: FocusCompaniesProps) {
  const t = useT();
  const inProgress = companies
    .filter((company) => company.overallStatus === "in_progress")
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

  return (
    <section className="flex h-full flex-col rounded-[10px] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-[16px] font-semibold text-foreground">
            {t("dashboard.focusCompanies.title")}
          </h2>
          <Info size={14} className="text-secondary" />
        </div>
        <Link href="/companies" className="text-xs font-medium text-primary hover:underline">
          {t("dashboard.focusCompanies.viewAll")}
        </Link>
      </div>

      {inProgress.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <EmptyState
            icon={Building2}
            title={t("dashboard.focusCompanies.emptyTitle")}
            description={t("dashboard.focusCompanies.emptySubtitle")}
          />
        </div>
      ) : (
        <ul>
          {inProgress.map(({ company, currentStepName, nextEventAt }, index) => {
            const isLast = index === inProgress.length - 1;

            return (
              <li key={company.id} className="transition-colors duration-150 hover:bg-background">
                <div className={"mx-4 " + (isLast ? "" : "border-b border-border")}>
                  <Link
                    href={`/companies/${company.id}`}
                    className="flex items-center gap-3 px-2 py-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(company.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {company.name}
                        </p>
                        <Badge
                          variant={PRIORITY_BADGE_VARIANT[company.priority]}
                          size="sm"
                          className="shrink-0"
                        >
                          {t(`companies.list.priority.${company.priority}`)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="neutral" size="sm" className="shrink-0">
                          {currentStepName}
                        </Badge>
                        <span className="truncate text-xs text-secondary">
                          {nextEventAt
                            ? formatRelativeTime(nextEventAt, t)
                            : t("dashboard.focusCompanies.noSchedule")}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
