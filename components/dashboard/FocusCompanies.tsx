"use client";

import Link from "next/link";
import { Info, Star } from "lucide-react";
import type { Company } from "@/lib/companies";
import { getCurrentStep, type ApplicationStep } from "@/lib/applicationSteps";
import { EVENT_TYPE_BADGE_CLASS, getNextEvent, type AppEvent } from "@/lib/events";
import { diffInDays, dateKeyOf, todayKey, formatTimeOfDay } from "@/lib/date";

interface FocusCompaniesProps {
  companies: Company[];
  events: AppEvent[];
  steps: ApplicationStep[];
}

const NO_STEP_LABEL = "등록된 전형 없음";
const MAX_ROWS = 5;

// 전형 단계 pill과 좌측 세로 바가 같은 기준(다음 일정의 이벤트 타입)으로 색을 맞추도록,
// EVENT_TYPE_BADGE_CLASS(다른 대시보드 카드에서 이미 쓰는 색)와 짝을 이루는 solid 색상만 추가한다.
const EVENT_TYPE_BAR_CLASS: Record<AppEvent["eventType"], string> = {
  schedule: "bg-primary",
  deadline: "bg-warning",
  result_announcement: "bg-joined",
};

function formatRelativeTime(iso: string): string {
  const key = dateKeyOf(iso);
  const diff = diffInDays(todayKey(), key);
  const dayLabel = diff === 0 ? "오늘" : diff === 1 ? "내일" : key.slice(5).replace("-", ".");
  return `${dayLabel} ${formatTimeOfDay(iso)}`;
}

// 01-dashboard.png의 "집중 관리 기업" 카드. 새 기능/데이터 없이 기존 companies.priority,
// getCurrentStep, getNextEvent만 재사용해 priority가 'high'인 기업만 골라 보여준다.
export default function FocusCompanies({ companies, events, steps }: FocusCompaniesProps) {
  const highPriority = companies
    .filter((company) => company.priority === "high")
    .map((company) => {
      const companySteps = steps.filter((step) => step.companyId === company.id);
      const companyEvents = events.filter((event) => event.companyId === company.id);
      const nextEvent = getNextEvent(companyEvents);
      const nextEventAt = nextEvent ? (nextEvent.startsAt ?? nextEvent.dueAt) : null;
      return {
        company,
        currentStepName: getCurrentStep(companySteps)?.name ?? NO_STEP_LABEL,
        nextEvent,
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
          <h2 className="text-[16px] font-semibold text-foreground">집중 관리 기업</h2>
          <Info size={14} className="text-secondary" />
        </div>
        <Link href="/companies" className="text-xs font-medium text-primary hover:underline">
          전체 보기 →
        </Link>
      </div>

      {highPriority.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <Star size={24} className="text-secondary" />
          <p className="text-sm font-medium text-foreground">아직 집중 관리할 기업이 없습니다</p>
          <p className="text-xs text-secondary">우선순위가 높은 기업이 없습니다</p>
        </div>
      ) : (
        <ul>
          {highPriority.map(({ company, currentStepName, nextEvent, nextEventAt }, index) => {
            const barClass = nextEvent ? EVENT_TYPE_BAR_CLASS[nextEvent.eventType] : "bg-border";
            const pillClass = nextEvent
              ? EVENT_TYPE_BADGE_CLASS[nextEvent.eventType]
              : "bg-secondary/10 text-secondary";
            const isLast = index === highPriority.length - 1;

            return (
              <li key={company.id} className="transition-colors duration-150 hover:bg-background">
                <div className={"mx-4 " + (isLast ? "" : "border-b border-border")}>
                  <Link
                    href={`/companies/${company.id}`}
                    className="flex items-center gap-2 px-2 py-3"
                  >
                    <span className={"h-10 w-0.5 shrink-0 rounded-full " + barClass} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {company.name}
                      </p>
                      <span
                        className={
                          "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium " +
                          pillClass
                        }
                      >
                        {currentStepName}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-foreground">
                        {nextEventAt ? formatRelativeTime(nextEventAt) : "예정 없음"}
                      </p>
                      {nextEvent && (
                        <p className="mt-1 text-xs text-secondary">{nextEvent.title}</p>
                      )}
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
