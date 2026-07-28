"use client";

import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { useTodayChecklist } from "@/components/dashboard/TodayChecklist";
import { getTodaySchedules } from "@/components/dashboard/TodayTimetable";
import { formatTimeOfDay } from "@/lib/date";
import type { Company } from "@/lib/companies";
import { EVENT_TYPE_BADGE_CLASS, type AppEvent } from "@/lib/events";
import type { ApplicationStep } from "@/lib/applicationSteps";

interface TodayScheduleProps {
  companies: Company[];
  events: AppEvent[];
  steps: ApplicationStep[];
}

interface ScheduleItem {
  event: AppEvent;
  at: string;
}

// 현재 시각 이후 중 가장 가까운 항목을 찾는다. 컴포넌트 렌더 함수 밖의 순수 함수로 분리해
// react-hooks/purity(렌더 중 Date.now() 직접 호출 금지) 규칙을 지킨다.
function findNextItem(items: ScheduleItem[]): ScheduleItem | undefined {
  const now = Date.now();
  return items.find((item) => new Date(item.at).getTime() >= now);
}

// 01-dashboard.png의 "오늘의 일정" 카드. 데이터는 TodayChecklist(마감 체크리스트)와
// TodayTimetable(오늘 일정)의 기존 훅/계산을 그대로 재사용해 시간순으로 합쳐 보여준다.
export default function TodaySchedule({ companies, events, steps }: TodayScheduleProps) {
  const { todayDeadlines, checkedIds, loaded, toggle, taskError } = useTodayChecklist(events);
  const todaySchedules = getTodaySchedules(events);

  const items = [
    ...todaySchedules.map((event) => ({ event, at: event.startsAt as string })),
    ...todayDeadlines.map((event) => ({ event, at: event.dueAt as string })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  // 현재 시각 이후 중 가장 가까운 일정 하나만 파란색으로 강조하고 나머지는 회색으로 표시한다.
  const nextItem = findNextItem(items);

  return (
    <section className="flex h-[372px] flex-col rounded-[10px] border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-secondary" />
          <h2 className="text-[16px] font-semibold text-foreground">오늘의 일정</h2>
        </div>
        <Link href="/calendar" className="text-xs font-medium text-primary hover:underline">
          전체 일정 보기 →
        </Link>
      </div>

      {taskError && (
        <p className="border-b border-error/40 bg-error/10 px-6 py-2 text-xs text-error">
          {taskError}
        </p>
      )}

      {items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-6 py-10 text-center text-sm text-secondary">
          오늘 예정된 일정이 없습니다 🎉
        </p>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {items.map(({ event, at }, index) => {
            const company = companies.find((c) => c.id === event.companyId);
            const step = steps.find((s) => s.id === event.applicationStepId);
            const isDeadline = event.eventType === "deadline";
            const checked = isDeadline && checkedIds.has(event.id);
            const isNext = nextItem?.event.id === event.id;
            const isLast = index === items.length - 1;

            return (
              <li
                key={event.id}
                className="transition-colors duration-150 hover:bg-background"
              >
                <div className={"mx-4 " + (isLast ? "" : "border-b border-border")}>
                  <div className="flex items-center gap-3 px-2 py-3.5">
                    {isDeadline && (
                      <button
                        type="button"
                        onClick={() => toggle(event.id)}
                        disabled={!loaded}
                        aria-pressed={checked}
                        aria-label={`${event.title} 완료 표시`}
                        className={
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border text-xs disabled:cursor-not-allowed disabled:opacity-50 " +
                          (checked
                            ? "border-primary bg-primary text-white"
                            : "border-border text-transparent")
                        }
                      >
                        ✓
                      </button>
                    )}
                    <span
                      className={
                        "h-9 w-0.5 shrink-0 rounded-full " + (isNext ? "bg-primary" : "bg-border")
                      }
                    />
                    <span
                      className={
                        "w-14 shrink-0 self-start text-sm font-semibold " +
                        (isNext ? "text-primary" : "text-secondary")
                      }
                    >
                      {formatTimeOfDay(at)}
                    </span>
                    <Link href={`/companies/${event.companyId}`} className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p
                          className={
                            "truncate text-sm font-bold " +
                            (checked ? "text-secondary line-through" : "text-foreground")
                          }
                        >
                          {company?.name ?? ""}
                        </p>
                        <span
                          className={
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                            EVENT_TYPE_BADGE_CLASS[event.eventType]
                          }
                        >
                          {step?.name ?? event.title}
                        </span>
                      </div>
                      <p className="truncate text-xs text-secondary">{event.title}</p>
                    </Link>
                    <ChevronRight size={16} className="shrink-0 text-secondary" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
