"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCompanies } from "@/lib/companies-context";
import type { Company } from "@/lib/companies";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

export default function CalendarPage() {
  const { companies, loading, error } = useCompanies();
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() =>
    startOfMonth(today.getFullYear(), today.getMonth())
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const eventsByDate = useMemo(() => {
    const map: Record<string, Company[]> = {};
    for (const company of companies) {
      if (!company.nextSchedule) continue;
      const list = map[company.nextSchedule] ?? [];
      list.push(company);
      map[company.nextSchedule] = list;
    }
    return map;
  }, [companies]);

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
        <p className="mt-1 text-sm text-secondary">기업별 다음 일정을 한눈에 확인하세요.</p>
      </header>

      <div className="mb-6 flex items-center gap-3">
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
                const events = eventsByDate[dateKey] ?? [];

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
                      {events.map((company) => (
                        <Link
                          key={company.id}
                          href={`/companies/${company.id}`}
                          className="block rounded-[6px] bg-primary/10 px-1.5 py-1 text-xs text-primary hover:bg-primary/20"
                        >
                          <span className="block truncate font-medium">{company.name}</span>
                          <span className="block truncate text-primary/80">
                            {company.currentStep}
                          </span>
                        </Link>
                      ))}
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
