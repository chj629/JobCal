"use client";

import { useMemo } from "react";
import {
  dateKeyParts,
  formatTimeOfDayInAsiaTokyo,
} from "@/lib/date";
import {
  CALENDAR_HOUR_ROW_HEIGHT,
  getCalendarWeekEventPosition,
  tokyoWallClock,
} from "@/components/calendar/calendarDate";
import { EVENT_CHIP_CLASS } from "@/components/calendar/eventChipStyle";
import type { AppEvent } from "@/lib/events";
import type { Company } from "@/lib/companies";
import type { ApplicationStep } from "@/lib/applicationSteps";
import { getStepDisplayName } from "@/lib/applicationSteps";
import { useT } from "@/lib/locale-context";
import ScrollFade from "@/components/ui/ScrollFade";
import { useScrollFade } from "@/lib/useScrollFade";

interface CalendarWeekGridProps {
  weekDayKeys: string[]; // 일~토 7일, YYYY-MM-DD
  todayDateKey: string;
  eventsByDate: Record<string, AppEvent[]>;
  companies: Company[];
  steps: ApplicationStep[];
  weekdayLabels: string[];
  onSelectEvent: (event: AppEvent) => void;
}

const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 20; // 이 시각의 "시작"까지 행을 그린다(즉 20:00 행까지 표시).

// docs/stitch/메인페이지 5개/jobcal_calendar_rectangular_event_cards_refresh의
// 우측 "Right Calendar (Week View)". 09:00-20:00 범위는 code.html 그대로지만, 실제
// 데이터에 이 범위를 벗어나는 이벤트가 있으면 표시 범위를 그만큼 넓힌다(코드가 임의로
// 잘라내 이벤트를 감추지 않도록).
export default function CalendarWeekGrid({
  weekDayKeys,
  todayDateKey,
  eventsByDate,
  companies,
  steps,
  weekdayLabels,
  onSelectEvent,
}: CalendarWeekGridProps) {
  const t = useT();

  const { startHour, endHour } = useMemo(() => {
    let min = DEFAULT_START_HOUR;
    let max = DEFAULT_END_HOUR;
    for (const dateKey of weekDayKeys) {
      const dayEvents = eventsByDate[dateKey] ?? [];
      for (const event of dayEvents) {
        const at = event.startsAt ?? event.dueAt;
        if (!at) continue;
        const start = tokyoWallClock(at);
        min = Math.min(min, start.hour);
        if (event.endsAt) {
          const end = tokyoWallClock(event.endsAt);
          max = Math.max(max, end.dateKey === start.dateKey ? end.hour + 1 : 24);
        } else {
          max = Math.max(max, start.hour + 1);
        }
      }
    }
    return { startHour: min, endHour: max };
  }, [weekDayKeys, eventsByDate]);

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour]
  );

  const { scrollRef, canScrollDown, onScroll } = useScrollFade([hours.length]);

  return (
    <div className="relative flex h-[847px] min-h-0 max-h-full flex-1 flex-col self-start overflow-hidden rounded-stitch-2xl border border-stitch-border bg-card shadow-sm">
      <div className="grid shrink-0 grid-cols-8 border-b border-stitch-border">
        <div className="col-span-1" />
        {weekDayKeys.map((dateKey, index) => {
          const { day } = dateKeyParts(dateKey);
          const isToday = dateKey === todayDateKey;

          return (
            <div
              key={dateKey}
              className={
                "flex flex-col items-center justify-center py-4 text-center " +
                (isToday ? "bg-primary-navy/5" : "")
              }
            >
              <span className="mb-1 text-[11px] font-[400] text-secondary">{weekdayLabels[index]}</span>
              {isToday ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-navy text-[14px] font-[400] text-white">
                  {day}
                </span>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center text-[14px] font-[400] text-stitch-ink">
                  {day}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="stitch-scrollbar-hidden relative flex-1 overflow-y-auto"
      >
        <div className="relative grid grid-cols-8" style={{ minHeight: hours.length * CALENDAR_HOUR_ROW_HEIGHT }}>
          <div className="relative col-span-1 border-r border-stitch-border">
            {hours.map((hour) => (
              <div key={hour} className="relative h-14 pb-1 pr-3 text-right">
                <span className="absolute bottom-[-8px] right-3 bg-card px-1 text-[11px] text-secondary">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          <div className="relative col-span-7">
            <div className="pointer-events-none absolute inset-0 flex flex-col">
              {hours.map((hour) => (
                <div key={hour} className="h-14 w-full border-b border-stitch-border" />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
              {weekDayKeys.map((dateKey) => {
                const isToday = dateKey === todayDateKey;
                return (
                  <div
                    key={dateKey}
                    className={"h-full border-r border-stitch-border/50 last:border-r-0 " + (isToday ? "bg-primary-navy/5" : "")}
                  />
                );
              })}
            </div>

            {weekDayKeys.map((dateKey, dayIndex) => {
              const dayEvents = eventsByDate[dateKey] ?? [];

              return dayEvents.map((event) => {
                const position = getCalendarWeekEventPosition(
                  event,
                  startHour,
                  hours.length
                );
                if (!position) return null;
                const company = companies.find((c) => c.id === event.companyId);
                const step = steps.find((s) => s.id === event.applicationStepId);
                const stepName = step ? getStepDisplayName(step, t) : event.title;
                const at = event.startsAt ?? event.dueAt;
                const timeLabel = at
                  ? formatTimeOfDayInAsiaTokyo(at) +
                    (event.endsAt
                      ? ` - ${formatTimeOfDayInAsiaTokyo(event.endsAt)}`
                      : "")
                  : "";

                return (
                  <div
                    key={event.id}
                    className="absolute flex px-1 py-[2px]"
                    style={{
                      left: `${(dayIndex / 7) * 100}%`,
                      width: `${100 / 7}%`,
                      top: position.top,
                      height: position.height,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className={
                        "flex h-full w-full flex-col overflow-hidden rounded-[6px] border p-2 text-left transition-colors " +
                        EVENT_CHIP_CLASS[event.eventType]
                      }
                    >
                      <span className="truncate text-[12px] font-[500] leading-tight">
                        {company?.name ?? ""}
                      </span>
                      <span className="mt-0.5 truncate text-[11px] leading-tight opacity-80">{stepName}</span>
                      <span className="mt-auto truncate text-[10px] leading-tight opacity-90">{timeLabel}</span>
                    </button>
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>

      <ScrollFade visible={canScrollDown} />
    </div>
  );
}
