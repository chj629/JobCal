"use client";

import { useMemo } from "react";
import { formatDateKey, formatTimeOfDay } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import { EVENT_CHIP_CLASS } from "@/components/calendar/eventChipStyle";
import type { AppEvent } from "@/lib/events";
import type { Company } from "@/lib/companies";

interface CalendarMonthGridProps {
  focusDate: Date;
  today: Date;
  eventsByDate: Record<string, AppEvent[]>;
  companies: Company[];
  weekdayLabels: string[];
  onSelectEvent: (event: AppEvent) => void;
}

const MAX_VISIBLE_CHIPS = 2;

// docs/stitch/메인페이지 5개/jobcal_calendar_high_density_compact_monthly_view의
// 우측 "Right Calendar (Month View)". min-h-[64px]는 이 Stitch 화면 이름대로
// "고밀도/컴팩트" 월간 뷰를 그대로 재현한 값이다.
export default function CalendarMonthGrid({
  focusDate,
  today,
  eventsByDate,
  companies,
  weekdayLabels,
  onSelectEvent,
}: CalendarMonthGridProps) {
  const t = useT();
  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();

  const days = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      return date;
    });
  }, [year, month]);

  const todayKeyStr = formatDateKey(today);

  return (
    <div className="flex h-[847px] min-h-0 max-h-full flex-1 flex-col self-start overflow-hidden rounded-stitch-2xl border border-stitch-border bg-card shadow-sm">
      <div className="grid shrink-0 grid-cols-7 border-b border-stitch-border">
        {weekdayLabels.map((label, index) => (
          <div key={index} className="py-4 text-center">
            <span className="text-[11px] font-[400] text-secondary">{label}</span>
          </div>
        ))}
      </div>
      {/* days.length/7은 항상 6(42칸)이라 grid-rows-6으로 고정하고, 각 행이 1fr씩 남은
          세로 공간을 균등하게 채우게 한다(Stitch code.html의 grid-rows-5 + flex-1과 동일한
          방식). 부모가 세로로 제한된 높이일 때만(md 이상) 의미가 있고, md 미만에서는
          이 컴포넌트 자체가 렌더링되지 않는다. */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-y-auto">
        {days.map((date) => {
          const dateKey = formatDateKey(date);
          const isCurrentMonth = date.getMonth() === month;
          const isToday = dateKey === todayKeyStr;
          const dayEvents = eventsByDate[dateKey] ?? [];
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_CHIPS);
          const overflowCount = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={dateKey}
              className={
                "flex min-h-[64px] flex-col gap-1 border-b border-r border-stitch-border/50 p-1.5 [&:nth-child(7n)]:border-r-0 " +
                (isToday ? "bg-primary-navy/5" : "")
              }
            >
              <div className="mb-1 text-left text-[12px]">
                {isToday ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-navy font-[400] text-white">
                    {date.getDate()}
                  </span>
                ) : (
                  <span className={isCurrentMonth ? "text-stitch-ink" : "text-secondary/50"}>
                    {date.getDate()}
                  </span>
                )}
              </div>

              {visibleEvents.map((event) => {
                const company = companies.find((c) => c.id === event.companyId);
                const at = event.startsAt ?? event.dueAt;
                const time = at ? formatTimeOfDay(at) : null;

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    title={`${company?.name ?? ""} · ${event.title}`}
                    className={
                      "w-full rounded-[6px] border px-1.5 py-1 text-left transition-colors " +
                      EVENT_CHIP_CLASS[event.eventType]
                    }
                  >
                    <span className="block truncate text-[10px] font-[400]">
                      {time && `${time} `}
                      {company?.name ?? event.title}
                    </span>
                  </button>
                );
              })}

              {overflowCount > 0 && (
                <span className="block w-fit rounded-[6px] bg-stitch-bg px-1.5 py-0.5 text-[10px] font-[400] text-secondary">
                  {t("calendar.more", { count: overflowCount })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
