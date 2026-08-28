"use client";

import { useMemo } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import {
  addDaysToDateKey,
  dateKeyParts,
  dateKeyToUtcDate,
  startOfMonthDateKey,
  startOfWeekDateKey,
} from "@/lib/date";
import { useLocale } from "@/lib/locale-context";
import type { AppEvent } from "@/lib/events";

interface MiniCalendarProps {
  focusDateKey: string;
  todayDateKey: string;
  eventsByDate: Record<string, AppEvent[]>;
  onNavigateMonth: (direction: 1 | -1) => void;
  onSelectDate: (dateKey: string) => void;
}

// docs/stitch/메인페이지 5개/jobcal_calendar_*의 좌측 "Mini Calendar" 카드. 이 카드의
// 좌우 화살표는 메인 그리드(월/주 토글)와 별개로 항상 "월" 단위로만 이동한다(code.html도
// 별도 버튼). 날짜를 클릭하면 페이지의 focusDate가 그 날짜로 바뀌어 메인 그리드가
// 그 날짜가 포함된 월/주로 이동한다.
export default function MiniCalendar({
  focusDateKey,
  todayDateKey,
  eventsByDate,
  onNavigateMonth,
  onSelectDate,
}: MiniCalendarProps) {
  const { locale } = useLocale();
  const localeCode = locale === "ja" ? "ja-JP" : "ko-KR";
  const { month } = dateKeyParts(focusDateKey);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(localeCode, {
        year: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(dateKeyToUtcDate(focusDateKey)),
    [localeCode, focusDateKey]
  );

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeCode, {
      weekday: "narrow",
      timeZone: "UTC",
    });
    return Array.from({ length: 7 }, (_, i) =>
      formatter.format(dateKeyToUtcDate(addDaysToDateKey("2023-01-01", i)))
    );
  }, [localeCode]);

  const dayKeys = useMemo(() => {
    const gridStart = startOfWeekDateKey(startOfMonthDateKey(focusDateKey));
    return Array.from({ length: 42 }, (_, i) => addDaysToDateKey(gridStart, i));
  }, [focusDateKey]);

  return (
    <div className="rounded-stitch-2xl border border-stitch-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-[14px] font-[400] text-stitch-ink">{monthLabel}</h4>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onNavigateMonth(-1)}
            className="flex h-6 w-6 items-center justify-center rounded text-secondary transition-colors hover:bg-black/[0.04]"
          >
            <MaterialIcon name="chevron_left" size={16} />
          </button>
          <button
            type="button"
            onClick={() => onNavigateMonth(1)}
            className="flex h-6 w-6 items-center justify-center rounded text-secondary transition-colors hover:bg-black/[0.04]"
          >
            <MaterialIcon name="chevron_right" size={16} />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-[400] text-secondary">
        {weekdayLabels.map((label, index) => (
          <div key={index}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center text-[11px]">
        {dayKeys.map((dateKey) => {
          const { month: dateMonth, day } = dateKeyParts(dateKey);
          const isCurrentMonth = dateMonth === month;
          const isToday = dateKey === todayDateKey;
          const hasEvents = (eventsByDate[dateKey]?.length ?? 0) > 0;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={
                "mx-auto flex h-6 w-6 items-center justify-center rounded-full font-[400] transition-colors " +
                (isToday
                  ? "bg-primary-navy text-white"
                  : hasEvents
                    ? "bg-[#dce1ff] text-primary-navy hover:bg-[#c7d0ff]"
                    : isCurrentMonth
                      ? "text-stitch-ink hover:bg-black/[0.04]"
                      : "text-secondary/40 hover:bg-black/[0.04]")
              }
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
