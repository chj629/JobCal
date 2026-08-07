"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTodayChecklist } from "@/components/dashboard/TodayChecklist";
import { getTodaySchedules } from "@/components/dashboard/TodayTimetable";
import { formatTimeOfDay } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import type { Company } from "@/lib/companies";
import type { AppEvent, EventType } from "@/lib/events";
import type { ApplicationStep } from "@/lib/applicationSteps";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface TodayScheduleProps {
  companies: Company[];
  events: AppEvent[];
  steps: ApplicationStep[];
}

interface ScheduleItem {
  event: AppEvent;
  at: string;
}

// lib/events.ts의 EVENT_TYPE_BADGE_CLASS와 동일한 색 의미를 Badge variant로 재사용한다.
const EVENT_TYPE_BADGE_VARIANT: Record<EventType, BadgeVariant> = {
  schedule: "primary",
  deadline: "warning",
  result_announcement: "purple",
};

// 현재 시각 이후 중 가장 가까운 항목을 찾는다. 컴포넌트 렌더 함수 밖의 순수 함수로 분리해
// react-hooks/purity(렌더 중 Date.now() 직접 호출 금지) 규칙을 지킨다.
function findNextItem(items: ScheduleItem[]): ScheduleItem | undefined {
  const now = Date.now();
  return items.find((item) => new Date(item.at).getTime() >= now);
}

// 6_homeAIOFF.png의 "오늘 할 일" 카드. 데이터는 TodayChecklist(마감 체크리스트)와
// TodayTimetable(오늘 일정)의 기존 훅/계산을 그대로 재사용해 시간순으로 합쳐 보여준다.
export default function TodaySchedule({ companies, events, steps }: TodayScheduleProps) {
  const t = useT();
  const router = useRouter();
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
        <h2 className="text-[16px] font-semibold text-foreground">
          {t("dashboard.todaySchedule.title")}
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/calendar")}>
          {t("dashboard.todaySchedule.viewAll")}
        </Button>
      </div>

      {taskError && (
        <p className="border-b border-error/40 bg-error/10 px-6 py-2 text-xs text-error">
          {taskError}
        </p>
      )}

      {items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-6 py-10 text-center text-sm text-secondary">
          {t("dashboard.todaySchedule.empty")}
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
              <li key={event.id} className="transition-colors duration-150 hover:bg-background">
                <div className={"mx-4 " + (isLast ? "" : "border-b border-border")}>
                  <div className="flex items-center gap-3 px-2 py-3">
                    {isDeadline ? (
                      <button
                        type="button"
                        onClick={() => toggle(event.id)}
                        disabled={!loaded}
                        aria-pressed={checked}
                        aria-label={t("dashboard.todaySchedule.completeLabel", {
                          title: event.title,
                        })}
                        className={
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border text-xs disabled:cursor-not-allowed disabled:opacity-50 " +
                          (checked
                            ? "border-primary bg-primary text-white"
                            : "border-border text-transparent")
                        }
                      >
                        ✓
                      </button>
                    ) : (
                      // 체크 대상이 아닌 일반 일정 항목. 체크박스와 같은 폭의 슬롯에 정적 점만
                      // 표시해, 마감(체크 가능) 항목과의 정렬은 맞추면서 상호작용 대상이 아님을
                      // 자연스럽게 구분한다.
                      <span
                        aria-hidden="true"
                        className="flex h-5 w-5 shrink-0 items-center justify-center"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-secondary/40" />
                      </span>
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
                      <div className="flex items-center gap-2">
                        <p
                          className={
                            "truncate text-sm font-bold " +
                            (checked ? "text-secondary line-through" : "text-foreground")
                          }
                        >
                          {company?.name ?? ""}
                        </p>
                        <Badge
                          variant={EVENT_TYPE_BADGE_VARIANT[event.eventType]}
                          size="sm"
                          className="shrink-0"
                        >
                          {step?.name ?? event.title}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-secondary">{event.title}</p>
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
