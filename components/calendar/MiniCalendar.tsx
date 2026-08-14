"use client";

import { useMemo } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { formatDateKey } from "@/lib/date";
import { useLocale } from "@/lib/locale-context";
import type { AppEvent } from "@/lib/events";

interface MiniCalendarProps {
  focusDate: Date;
  today: Date;
  eventsByDate: Record<string, AppEvent[]>;
  onNavigateMonth: (direction: 1 | -1) => void;
  onSelectDate: (date: Date) => void;
}

// docs/stitch/메인페이지 5개/jobcal_calendar_*의 좌측 "Mini Calendar" 카드. 이 카드의
// 좌우 화살표는 메인 그리드(월/주 토글)와 별개로 항상 "월" 단위로만 이동한다(code.html도
// 별도 버튼). 날짜를 클릭하면 페이지의 focusDate가 그 날짜로 바뀌어 메인 그리드가
// 그 날짜가 포함된 월/주로 이동한다.
export default function MiniCalendar({
  focusDate,
  today,
  eventsByDate,
  onNavigateMonth,
  onSelectDate,
}: MiniCalendarProps) {
  const { locale } = useLocale();
  const localeCode = locale === "ja" ? "ja-JP" : "ko-KR";
  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(localeCode, { year: "numeric", month: "long" }).format(focusDate),
    [localeCode, focusDate]
  );

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeCode, { weekday: "narrow" });
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2023, 0, 1 + i)));
  }, [localeCode]);

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
        {days.map((date) => {
          const dateKey = formatDateKey(date);
          const isCurrentMonth = date.getMonth() === month;
          const isToday = dateKey === todayKeyStr;
          const hasEvents = (eventsByDate[dateKey]?.length ?? 0) > 0;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(date)}
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
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
