"use client";

import { useMemo, useState } from "react";
import { useCompanies } from "@/lib/companies-context";
import { useEvents } from "@/lib/events-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { getStepDisplayName } from "@/lib/applicationSteps";
import { EVENT_TYPE_BADGE_CLASS, EVENT_TYPES, type AppEvent, type EventType } from "@/lib/events";
import { formatDateKey, dateKeyOf, formatTimeOfDay } from "@/lib/date";
import { useLocale, useT } from "@/lib/locale-context";
import Button from "@/components/ui/Button";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import LoadingState from "@/components/ui/LoadingState";
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

// 모바일(md 미만) 날짜 셀의 dot 표시용. EVENT_TYPE_BADGE_VARIANT/EVENT_TYPE_BADGE_CLASS와
// 동일한 타입별 색상(파랑/주황/보라)을 점 형태(단색 배경)로만 다르게 재사용한다.
const EVENT_TYPE_DOT_CLASS: Record<EventType, string> = {
  schedule: "bg-primary",
  deadline: "bg-warning",
  result_announcement: "bg-joined",
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
  // 모바일 전용(md 미만) 날짜 선택 상태. dateKey("YYYY-MM-DD") 문자열로 관리해 eventsByDate와
  // 바로 매칭한다. 초기값은 null — 첫 진입 시 선택 날짜 리스트가 UpcomingSchedulePanel의
  // "오늘의 일정"과 중복 표시되지 않도록, 사용자가 날짜를 직접 누르거나 "오늘" 버튼을
  // 눌렀을 때만 값이 채워진다.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  // 모바일 선택 날짜 리스트(md:hidden)용 파생 값. eventsByDate를 그대로 재사용하고,
  // 라벨은 이미 계산된 days(현재 그리드에 실제로 그려지는 Date 객체들)에서 찾아
  // 문자열을 다시 Date로 파싱하는 별도 로직을 만들지 않는다.
  const selectedDateEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];
  const selectedDateObj = days.find((date) => formatDateKey(date) === selectedDate) ?? null;
  const selectedDateLabel = selectedDateObj
    ? new Intl.DateTimeFormat(localeCode, {
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(selectedDateObj)
    : "";

  function goToPrevMonth() {
    setViewDate(startOfMonth(year, month - 1));
    setSelectedDate(null);
  }
  function goToNextMonth() {
    setViewDate(startOfMonth(year, month + 1));
    setSelectedDate(null);
  }
  function goToToday() {
    setViewDate(startOfMonth(today.getFullYear(), today.getMonth()));
    setSelectedDate(formatDateKey(today));
  }

  const todayKey = formatDateKey(today);

  // 10_calendar.png 기준: 일요일은 빨강, 토요일은 파랑 계열로 요일 헤더/날짜 숫자를 구분한다.
  function weekendTextClass(dayOfWeek: number) {
    if (dayOfWeek === 0) return "text-error";
    if (dayOfWeek === 6) return "text-primary";
    return "";
  }

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">{t("calendar.title")}</h1>
        <p className="mt-1 text-sm text-secondary">{t("calendar.description")}</p>
      </header>

      {/* 2단 전환은 뷰포트가 아니라 app/(app)/layout.tsx의 <main @container/main>이 실제로
          갖고 있는 폭을 기준으로 한다(AI Drawer가 push로 열려 main이 좁아지면 뷰포트가
          1600px 이상이어도 1단을 유지, 닫히면 자동으로 2단 복귀). 좌측 그리드(min-w-880)
          + gap-6(24) + 우측 320px 패널이 스크롤 없이 들어오려면 main이 최소
          880+24+320+px-8(64)=1288px 있어야 하므로, 여유를 조금 두고 1320px를 기준으로
          잡는다. 이 기준을 넘기만 하면 그리드 실폭은 항상 1320-64-24-320=912px 이상이라
          아래 min-w-880px(1600px에서 780px로 낮추는 기존 로직 포함)가 항상 안전하게
          들어간다. md~1320px(컨테이너 기준, 태블릿/좁은 데스크톱)와 md 미만(모바일)의
          기존 min-w 로직은 이번에 손대지 않았다. */}
      <div className="grid grid-cols-1 gap-6 @min-[1320px]/main:grid-cols-[minmax(0,1fr)_320px] @min-[1320px]/main:items-start">
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
        <LoadingState>{t("calendar.loading")}</LoadingState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <div className="min-w-0 md:min-w-[880px] min-[1600px]:min-w-[780px]">
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

                // 오늘(꽉 찬 파란 원)과 겹쳐 흐릿해지지 않도록, "선택됨" 표시는 오늘이
                // 아닐 때만 날짜 숫자 배지에 링으로 준다(모바일 전용).
                const isSelected = dateKey === selectedDate && !isToday;

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    className={
                      "min-h-[72px] md:min-h-[110px] border-b border-r border-border p-2 [&:nth-child(7n)]:border-r-0 " +
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
                            : "text-secondary") +
                        (isSelected ? " max-md:ring-2 max-md:ring-primary" : "")
                      }
                    >
                      {date.getDate()}
                    </span>
                    {/* 데스크톱(md 이상): 기존 시간+회사명 텍스트 pill. 내용/동작은 전혀
                        바꾸지 않고 표시 여부만 hidden md:flex로 감싼다. */}
                    <div className="mt-1 hidden flex-col gap-1 md:flex">
                      {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => {
                        const company = companies.find((c) => c.id === event.companyId);
                        const at = event.startsAt ?? event.dueAt;
                        const time = at ? formatTimeOfDay(at) : null;

                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={(e) => {
                              // 이 버튼은 날짜 셀 onClick 안에 중첩돼 있어, 그대로 두면 pill
                              // 클릭이 부모로 버블링돼 setSelectedDate까지 함께 실행된다.
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
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

                    {/* 모바일(md 미만): 텍스트 pill 대신 타입별 색 dot 최대 3개 + 초과분은
                        +N. 개별 dot에는 onClick을 두지 않고, 날짜 셀 전체의 기존 클릭
                        영역(터치 타겟)에 맡긴다. */}
                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-1 md:hidden">
                        {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
                          <span
                            key={event.id}
                            aria-hidden="true"
                            className={
                              "h-1.5 w-1.5 shrink-0 rounded-full " + EVENT_TYPE_DOT_CLASS[event.eventType]
                            }
                          />
                        ))}
                        {dayEvents.length > MAX_VISIBLE_EVENTS && (
                          <span className="text-[10px] font-medium leading-none text-secondary">
                            +{dayEvents.length - MAX_VISIBLE_EVENTS}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 모바일(md 미만) 전용 선택 날짜 일정 리스트. 날짜 셀 pill과 동일하게 eventsByDate를
          재사용하고, 항목 클릭 시 기존 EventDetailPopover를 그대로 연다. md 이상에서는
          md:hidden으로 완전히 숨겨 데스크톱 그리드에는 영향이 없다. selectedDate가 null인
          첫 진입 상태에서는 렌더링 자체를 하지 않는다. */}
      {!loading && selectedDate && (
        <div className="mt-4 rounded-lg border border-border bg-card md:hidden">
          <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
            {selectedDateLabel}
          </h2>
          {selectedDateEvents.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-secondary">
              {t("calendar.selectedDateEmpty")}
            </p>
          ) : (
            <ul>
              {selectedDateEvents.map((event, index) => {
                const company = companies.find((c) => c.id === event.companyId);
                const at = event.startsAt ?? event.dueAt;
                const time = at ? formatTimeOfDay(at) : null;
                const isLast = index === selectedDateEvents.length - 1;

                return (
                  <li key={event.id} className="transition-colors duration-150 hover:bg-background">
                    <div className={"mx-4 " + (isLast ? "" : "border-b border-border")}>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className="block w-full px-2 py-3 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={EVENT_TYPE_BADGE_VARIANT[event.eventType]} size="sm">
                            {t(EVENT_TYPE_LABEL_KEYS[event.eventType])}
                          </Badge>
                          {time && <span className="text-xs text-secondary">{time}</span>}
                        </div>
                        <p className="mt-2 truncate text-sm font-bold text-foreground">
                          {company?.name ?? ""}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-secondary">{event.title}</p>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      </div>

      <UpcomingSchedulePanel companies={companies} events={events} steps={steps} />
      </div>

      {selectedEvent && (
        <EventDetailPopover
          event={selectedEvent}
          companyName={companies.find((c) => c.id === selectedEvent.companyId)?.name ?? ""}
          stepName={(() => {
            const step = steps.find((s) => s.id === selectedEvent.applicationStepId);
            return step ? getStepDisplayName(step, t) : null;
          })()}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
