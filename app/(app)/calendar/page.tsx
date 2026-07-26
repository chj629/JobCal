"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCompanies } from "@/lib/companies-context";
import { useEvents } from "@/lib/events-context";
import { EVENT_TYPE_BADGE_CLASS, EVENT_TYPE_LABELS, type AppEvent } from "@/lib/events";
import { formatDateKey, dateKeyOf } from "@/lib/date";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_VISIBLE_EVENTS = 3;

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

export default function CalendarPage() {
  const { companies, loading: companiesLoading, error } = useCompanies();
  const { events, loading: eventsLoading } = useEvents();
  const loading = companiesLoading || eventsLoading;
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() =>
    startOfMonth(today.getFullYear(), today.getMonth())
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const eventsByDate = useMemo(() => {
    const map: Record<string, AppEvent[]> = {};
    for (const event of events) {
      const at = event.startsAt ?? event.dueAt;
      if (!at) continue;
      const dateKey = dateKeyOf(at);
      const list = map[dateKey] ?? [];
      list.push(event);
      map[dateKey] = list;
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => {
        const atA = (a.startsAt ?? a.dueAt) as string;
        const atB = (b.startsAt ?? b.dueAt) as string;
        return new Date(atA).getTime() - new Date(atB).getTime();
      });
    }
    return map;
  }, [events]);

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

  function goToPrevMonth() {
    setViewDate(startOfMonth(year, month - 1));
  }
  function goToNextMonth() {
    setViewDate(startOfMonth(year, month + 1));
  }
  function goToToday() {
    setViewDate(startOfMonth(today.getFullYear(), today.getMonth()));
  }

  const todayKey = formatDateKey(today);

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">캘린더</h1>
        <p className="mt-1 text-sm text-secondary">기업별 일정을 한눈에 확인하세요.</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="h-10 rounded-[10px] border border-border px-4 text-sm font-medium text-foreground"
        >
          이전 달
        </button>
        <button
          type="button"
          onClick={goToToday}
          className="h-10 rounded-[10px] border border-border px-4 text-sm font-medium text-foreground"
        >
          오늘
        </button>
        <button
          type="button"
          onClick={goToNextMonth}
          className="h-10 rounded-[10px] border border-border px-4 text-sm font-medium text-foreground"
        >
          다음 달
        </button>
        <span className="ml-2 text-[16px] font-semibold text-foreground">
          {year}년 {month + 1}월
        </span>

        <div className="ml-auto flex items-center gap-3 text-xs text-secondary">
          {(Object.keys(EVENT_TYPE_LABELS) as Array<keyof typeof EVENT_TYPE_LABELS>).map((type) => (
            <span key={type} className="flex items-center gap-1">
              <span className={"h-2.5 w-2.5 rounded-full " + EVENT_TYPE_BADGE_CLASS[type]} />
              {EVENT_TYPE_LABELS[type]}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-[10px] border border-border bg-card px-6 py-10 text-center text-sm text-secondary">
          불러오는 중입니다...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-border bg-card">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-3 py-2 text-center text-sm font-medium text-secondary"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((date) => {
                const dateKey = formatDateKey(date);
                const isCurrentMonth = date.getMonth() === month;
                const isToday = dateKey === todayKey;
                const dayEvents = eventsByDate[dateKey] ?? [];

                return (
                  <div
                    key={dateKey}
                    className={
                      "min-h-[110px] border-b border-r border-border p-2 [&:nth-child(7n)]:border-r-0 " +
                      (isCurrentMonth ? "" : "bg-background/60")
                    }
                  >
                    <span
                      className={
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium " +
                        (isToday
                          ? "bg-primary text-white"
                          : isCurrentMonth
                            ? "text-foreground"
                            : "text-secondary")
                      }
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-1 flex flex-col gap-1">
                      {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => {
                        const company = companies.find((c) => c.id === event.companyId);
                        return (
                          <Link
                            key={event.id}
                            href={`/companies/${event.companyId}`}
                            title={`${company?.name ?? ""} · ${event.title}`}
                            className={
                              "block truncate rounded-[6px] px-1.5 py-1 text-xs hover:opacity-80 " +
                              EVENT_TYPE_BADGE_CLASS[event.eventType]
                            }
                          >
                            {company?.name ?? ""}
                          </Link>
                        );
                      })}
                      {dayEvents.length > MAX_VISIBLE_EVENTS && (
                        <span className="px-1.5 text-xs text-secondary">
                          +{dayEvents.length - MAX_VISIBLE_EVENTS}개
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
