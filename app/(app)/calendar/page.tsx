"use client";

import { useMemo, useState } from "react";
import { useCompanies } from "@/lib/companies-context";
import { useEvents } from "@/lib/events-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { EVENT_TYPE_BADGE_CLASS, EVENT_TYPES, type AppEvent, type EventType } from "@/lib/events";
import { formatDateKey, dateKeyOf, formatTimeOfDay } from "@/lib/date";
import { useLocale, useT } from "@/lib/locale-context";
import Button from "@/components/ui/Button";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import EventDetailPopover from "@/components/calendar/EventDetailPopover";
import UpcomingSchedulePanel from "@/components/calendar/UpcomingSchedulePanel";

const MAX_VISIBLE_EVENTS = 3;

// lib/events.ts의 EVENT_TYPE_LABELS(한국어 고정)는 그대로 두고, 기업 상세 단계에서 만든
// companies.events.types.*를 재사용해 표시 라벨만 번역한다.
const EVENT_TYPE_LABEL_KEYS: Record<EventType, string> = {
  schedule: "companies.events.types.schedule",
  deadline: "companies.events.types.deadline",
  result_announcement: "companies.events.types.resultAnnouncement",
};

// lib/events.ts의 EVENT_TYPE_BADGE_CLASS와 동일한 색상 의미를 범례의 Badge variant로 재사용한다.
const EVENT_TYPE_BADGE_VARIANT: Record<EventType, BadgeVariant> = {
  schedule: "primary",
  deadline: "warning",
  result_announcement: "purple",
};

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

export default function CalendarPage() {
  const t = useT();
  const { locale } = useLocale();
  const { companies, loading: companiesLoading, error } = useCompanies();
  const { events, loading: eventsLoading } = useEvents();
  const { steps } = useApplicationSteps();
  const loading = companiesLoading || eventsLoading;
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() =>
    startOfMonth(today.getFullYear(), today.getMonth())
  );
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // 요일/월 표기는 Intl.DateTimeFormat으로 locale에 맞게 생성한다(날짜 계산 로직과는 무관).
  const localeCode = locale === "ja" ? "ja-JP" : "ko-KR";
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeCode, { weekday: "short" });
    // 2023-01-01은 일요일이므로 이를 기준으로 일~토 순서의 짧은 요일 이름을 만든다.
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2023, 0, 1 + i)));
  }, [localeCode]);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(localeCode, { year: "numeric", month: "long" }).format(viewDate),
    [localeCode, viewDate]
  );

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

  // 10_calendar.png 기준: 일요일은 빨강, 토요일은 파랑 계열로 요일 헤더/날짜 숫자를 구분한다.
  function weekendTextClass(dayOfWeek: number) {
    if (dayOfWeek === 0) return "text-error";
    if (dayOfWeek === 6) return "text-primary";
    return "";
  }

  return (
    <div className="mx-auto max-w-[1320px] px-8 py-8">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">{t("calendar.title")}</h1>
        <p className="mt-1 text-sm text-secondary">{t("calendar.description")}</p>
      </header>

      {/* 월간 그리드(min-w-[880px])와 320px 우측 패널이 gap과 함께 나란히 들어가려면
          사이드바(240px)를 제외한 실제 폭이 최소 1224px 이상 필요하다. lg(1024px)나
          xl(1280px)에서 2단으로 전환하면 그 폭을 확보하지 못해 항상 카드 내부 가로
          스크롤이 생기므로, 실측 기준으로 여유 있게 맞아떨어지는 1600px에서 전환한다. */}
      <div className="grid grid-cols-1 gap-6 min-[1600px]:grid-cols-[minmax(0,1fr)_320px] min-[1600px]:items-start">
      <div className="min-w-0">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={goToPrevMonth}>
          {t("calendar.previousMonth")}
        </Button>
        <Button type="button" variant="secondary" onClick={goToToday}>
          {t("calendar.today")}
        </Button>
        <Button type="button" variant="secondary" onClick={goToNextMonth}>
          {t("calendar.nextMonth")}
        </Button>
        <span className="ml-2 text-[16px] font-semibold text-foreground">{monthLabel}</span>

        <div className="ml-auto flex items-center gap-2">
          {EVENT_TYPES.map((type) => (
            <Badge key={type} variant={EVENT_TYPE_BADGE_VARIANT[type]} size="sm">
              {t(EVENT_TYPE_LABEL_KEYS[type])}
            </Badge>
          ))}
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-secondary">
          {t("calendar.loading")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-7 border-b border-border">
              {weekdayLabels.map((day, index) => (
                <div
                  key={index}
                  className={
                    "px-3 py-2 text-center text-sm font-medium " +
                    (weekendTextClass(index) || "text-secondary")
                  }
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
                const weekendClass = isCurrentMonth ? weekendTextClass(date.getDay()) : "";

                return (
                  <div
                    key={dateKey}
                    className={
                      "min-h-[110px] border-b border-r border-border p-2 [&:nth-child(7n)]:border-r-0 " +
                      (isCurrentMonth ? "" : "bg-background/60") +
                      (isToday ? " ring-2 ring-inset ring-primary" : "")
                    }
                  >
                    <span
                      className={
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium " +
                        (isToday
                          ? "bg-primary text-white"
                          : isCurrentMonth
                            ? weekendClass || "text-foreground"
                            : "text-secondary")
                      }
                    >
                      {date.getDate()}
                    </span>
                    <div className="mt-1 flex flex-col gap-1">
                      {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => {
                        const company = companies.find((c) => c.id === event.companyId);
                        const at = event.startsAt ?? event.dueAt;
                        const time = at ? formatTimeOfDay(at) : null;

                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedEvent(event)}
                            title={`${company?.name ?? ""} · ${event.title}`}
                            className={
                              "block w-full truncate rounded-md px-1.5 py-1 text-left text-xs hover:opacity-80 " +
                              EVENT_TYPE_BADGE_CLASS[event.eventType]
                            }
                          >
                            {time && <span className="font-medium">{time} </span>}
                            {company?.name ?? ""}
                          </button>
                        );
                      })}
                      {dayEvents.length > MAX_VISIBLE_EVENTS && (
                        <span className="inline-block w-fit rounded-md bg-background px-1.5 py-0.5 text-xs font-medium text-secondary">
                          {t("calendar.more", { count: dayEvents.length - MAX_VISIBLE_EVENTS })}
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

      <UpcomingSchedulePanel companies={companies} events={events} steps={steps} />
      </div>

      {selectedEvent && (
        <EventDetailPopover
          event={selectedEvent}
          companyName={companies.find((c) => c.id === selectedEvent.companyId)?.name ?? ""}
          stepName={steps.find((s) => s.id === selectedEvent.applicationStepId)?.name ?? null}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
