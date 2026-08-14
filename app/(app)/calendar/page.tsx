"use client";

import { useMemo, useState } from "react";
import { useCompanies } from "@/lib/companies-context";
import { useEvents } from "@/lib/events-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { getStepDisplayName } from "@/lib/applicationSteps";
import { EVENT_TYPES, type AppEvent, type EventType } from "@/lib/events";
import { formatDateKey, dateKeyOf, formatTimeOfDay } from "@/lib/date";
import { useLocale, useT } from "@/lib/locale-context";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import MaterialIcon from "@/components/ui/MaterialIcon";
import EventDetailPopover from "@/components/calendar/EventDetailPopover";
import UpcomingSchedulePanel from "@/components/calendar/UpcomingSchedulePanel";
import MiniCalendar from "@/components/calendar/MiniCalendar";
import TodayEventsCard from "@/components/calendar/TodayEventsCard";
import CalendarWeeklyProgress from "@/components/calendar/CalendarWeeklyProgress";
import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import CalendarWeekGrid from "@/components/calendar/CalendarWeekGrid";

const MAX_VISIBLE_EVENTS = 3;

// Stitch(월간/주간 두 화면 모두)에는 이 타입 범례가 없다. 기능/데이터 구분 로직은
// EVENT_TYPE_BADGE_CLASS 등 아래에서 계속 쓰지만, 화면에는 기본으로 노출하지 않는다.
const SHOW_EVENT_TYPE_LEGEND = false;

// Stitch 두 화면 모두 우측에 "다가오는 일정" 패널이 없다(좌측 미니 위젯 3개 + 메인 그리드
// 2단 구성). 기존 로직은 그대로 두고 기본 화면에서만 숨긴다.
const SHOW_UPCOMING_SCHEDULE_PANEL = false;

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

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function CalendarPage() {
  const t = useT();
  const { locale } = useLocale();
  const { companies, loading: companiesLoading, error } = useCompanies();
  const { events, loading: eventsLoading } = useEvents();
  const { steps } = useApplicationSteps();
  const loading = companiesLoading || eventsLoading;
  const today = useMemo(() => new Date(), []);

  // docs/stitch/메인페이지 5개의 캘린더 두 화면(월간/주간)은 같은 페이지의 토글
  // 상태다. focusDate 하나가 월간 뷰에서는 "표시 중인 달", 주간 뷰에서는 "표시 중인 주"를
  // 결정하는 단일 기준점 역할을 한다. 미니 캘린더는 항상 focusDate가 속한 달을 보여주고,
  // 날짜를 클릭하면 focusDate가 그 날짜로 바뀌어 메인 그리드가 따라 이동한다.
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [focusDate, setFocusDate] = useState(() => today);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  // 모바일 전용(md 미만) 날짜 선택 상태. dateKey("YYYY-MM-DD") 문자열로 관리해 eventsByDate와
  // 바로 매칭한다. 초기값은 null — 첫 진입 시 선택 날짜 리스트가 UpcomingSchedulePanel의
  // "오늘의 일정"과 중복 표시되지 않도록, 사용자가 날짜를 직접 누르거나 "오늘" 버튼을
  // 눌렀을 때만 값이 채워진다.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();

  // 요일/월 표기는 Intl.DateTimeFormat으로 locale에 맞게 생성한다(날짜 계산 로직과는 무관).
  const localeCode = locale === "ja" ? "ja-JP" : "ko-KR";
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeCode, { weekday: "short" });
    // 2023-01-01은 일요일이므로 이를 기준으로 일~토 순서의 짧은 요일 이름을 만든다.
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2023, 0, 1 + i)));
  }, [localeCode]);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(localeCode, { year: "numeric", month: "long" }).format(focusDate),
    [localeCode, focusDate]
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(focusDate);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [focusDate]);

  const weekRangeLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    return t("calendar.weekRangeLabel", {
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      startDay: start.getDate(),
      endDay: end.getDate(),
    });
  }, [weekDays, t]);

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

  const todayKey = formatDateKey(today);
  const todayEvents = eventsByDate[todayKey] ?? [];

  function goToPrev() {
    if (viewMode === "month") {
      setFocusDate(startOfMonth(year, month - 1));
    } else {
      const prev = new Date(focusDate);
      prev.setDate(prev.getDate() - 7);
      setFocusDate(prev);
    }
    setSelectedDate(null);
  }
  function goToNext() {
    if (viewMode === "month") {
      setFocusDate(startOfMonth(year, month + 1));
    } else {
      const next = new Date(focusDate);
      next.setDate(next.getDate() + 7);
      setFocusDate(next);
    }
    setSelectedDate(null);
  }
  function goToToday() {
    setFocusDate(today);
    setSelectedDate(formatDateKey(today));
  }
  function goToMiniCalMonth(direction: 1 | -1) {
    setFocusDate((prev) => startOfMonth(prev.getFullYear(), prev.getMonth() + direction));
  }
  function handleSelectDate(date: Date) {
    setFocusDate(date);
    setSelectedDate(formatDateKey(date));
  }

  // 10_calendar.png 기준: 일요일은 빨강, 토요일은 파랑 계열로 요일 헤더/날짜 숫자를 구분한다.
  function weekendTextClass(dayOfWeek: number) {
    if (dayOfWeek === 0) return "text-error";
    if (dayOfWeek === 6) return "text-primary";
    return "";
  }

  return (
    // docs/stitch/메인페이지 5개의 캘린더 두 화면은 body가 h-screen overflow-hidden이고
    // 메인 그리드가 grid-rows-N(1fr씩 균등 분할)으로 남은 세로 공간을 꽉 채운다.
    // md 미만은 대응하는 Stitch 화면이 없어 기존처럼 일반 스크롤을 그대로 둔다.
    <div className="min-h-screen bg-stitch-bg md:flex md:h-[calc(100vh_-_65px)] md:min-h-0 md:flex-col md:overflow-hidden">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 py-6 font-[family-name:var(--font-hanken-grotesk)] font-[350] tracking-[-0.025em] text-stitch-ink md:h-full md:min-h-0 md:pb-6 md:pt-14">
        <div className="mb-6 flex shrink-0 flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-1.5 text-[36px] font-[400] leading-[1.2] tracking-tight text-stitch-ink">
              {t("calendar.title")}
            </h1>
            <p className="text-[16px] text-secondary">{t("calendar.description")}</p>
          </div>

          {/* 데스크톱(md 이상) 전용 Stitch 툴바. 월/주 토글은 이번에 새로 생긴 기능이라
              대응하는 모바일 레이아웃이 없어, 모바일은 아래의 기존 스타일 툴바를 쓴다. */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-1 rounded-stitch-xl border border-stitch-border bg-card p-1 shadow-sm">
              <button
                type="button"
                onClick={goToToday}
                className="rounded-stitch-lg px-4 py-1.5 text-[12px] font-[400] text-stitch-ink transition-colors hover:bg-black/[0.04]"
              >
                {t("calendar.today")}
              </button>
              <div className="mx-1 h-4 w-px bg-stitch-border" />
              <button
                type="button"
                onClick={goToPrev}
                aria-label={viewMode === "month" ? t("calendar.previousMonth") : t("calendar.previousWeek")}
                className="flex h-7 w-7 items-center justify-center rounded-stitch-lg text-secondary transition-colors hover:bg-black/[0.04] hover:text-stitch-ink"
              >
                <MaterialIcon name="chevron_left" size={18} />
              </button>
              <button
                type="button"
                onClick={goToNext}
                aria-label={viewMode === "month" ? t("calendar.nextMonth") : t("calendar.nextWeek")}
                className="flex h-7 w-7 items-center justify-center rounded-stitch-lg text-secondary transition-colors hover:bg-black/[0.04] hover:text-stitch-ink"
              >
                <MaterialIcon name="chevron_right" size={18} />
              </button>
              <h3 className="min-w-[140px] px-3 text-center text-[13px] font-[400] text-stitch-ink">
                {viewMode === "month" ? monthLabel : weekRangeLabel}
              </h3>
            </div>

            <div className="flex items-center rounded-stitch-xl border border-stitch-border bg-card p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={
                  "rounded-stitch-lg px-4 py-1.5 text-[12px] font-[400] transition-colors " +
                  (viewMode === "month" ? "bg-black/[0.04] text-stitch-ink" : "text-secondary hover:text-stitch-ink")
                }
              >
                {t("calendar.viewToggle.month")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={
                  "rounded-stitch-lg px-4 py-1.5 text-[12px] font-[400] transition-colors " +
                  (viewMode === "week" ? "bg-black/[0.04] text-stitch-ink" : "text-secondary hover:text-stitch-ink")
                }
              >
                {t("calendar.viewToggle.week")}
              </button>
            </div>
          </div>

          {/* 모바일(md 미만) 전용. 항상 월간 뷰만 보여주므로 startOfMonth로 직접 이동한다
              (goToPrev/goToNext는 viewMode="week"일 때 주 단위로 움직이기 때문). */}
          <div className="flex flex-wrap items-center gap-2 md:hidden">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFocusDate(startOfMonth(year, month - 1));
                setSelectedDate(null);
              }}
            >
              {t("calendar.previousMonth")}
            </Button>
            <Button type="button" variant="secondary" onClick={goToToday}>
              {t("calendar.today")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFocusDate(startOfMonth(year, month + 1));
                setSelectedDate(null);
              }}
            >
              {t("calendar.nextMonth")}
            </Button>
            <span className="ml-2 text-[16px] font-semibold text-foreground">{monthLabel}</span>
          </div>
        </div>

        {SHOW_EVENT_TYPE_LEGEND && (
          <div className="mb-4 flex shrink-0 items-center gap-2">
            {EVENT_TYPES.map((type) => (
              <Badge key={type} variant={EVENT_TYPE_BADGE_VARIANT[type]} size="sm">
                {t(EVENT_TYPE_LABEL_KEYS[type])}
              </Badge>
            ))}
          </div>
        )}

        {error && (
          <p className="mb-6 shrink-0 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        {loading ? (
          <LoadingState>{t("calendar.loading")}</LoadingState>
        ) : (
          <>
            {/* 데스크톱(md 이상): Stitch 좌측 패널(미니 캘린더/오늘의 예정/주간 진행률) +
                우측 메인 그리드(월/주 토글) 2단 구성. md:min-h-0이 있어야 이 행이 부모의
                남은 높이만큼만 차지하고, 메인 그리드가 그 안에서 grid-rows-N으로 늘어난다. */}
            <div className="hidden gap-6 md:flex md:min-h-0 md:flex-1">
              <div className="flex w-72 shrink-0 flex-col gap-4 md:overflow-y-auto">
                <MiniCalendar
                  focusDate={focusDate}
                  today={today}
                  eventsByDate={eventsByDate}
                  onNavigateMonth={goToMiniCalMonth}
                  onSelectDate={handleSelectDate}
                />
                <TodayEventsCard
                  events={todayEvents}
                  companies={companies}
                  onSelectEvent={setSelectedEvent}
                />
                <CalendarWeeklyProgress events={events} />
              </div>

              {viewMode === "month" ? (
                <CalendarMonthGrid
                  focusDate={focusDate}
                  today={today}
                  eventsByDate={eventsByDate}
                  companies={companies}
                  weekdayLabels={weekdayLabels}
                  onSelectEvent={setSelectedEvent}
                />
              ) : (
                <CalendarWeekGrid
                  weekDays={weekDays}
                  today={today}
                  eventsByDate={eventsByDate}
                  companies={companies}
                  steps={steps}
                  weekdayLabels={weekdayLabels}
                  onSelectEvent={setSelectedEvent}
                />
              )}
            </div>

            {/* 모바일(md 미만): Stitch에 대응 화면이 없어 기존 구현을 그대로 유지한다
                (월간 그리드 + 날짜별 dot 표시 + 선택 날짜 리스트). */}
            <div className="overflow-x-auto rounded-lg border border-border bg-card md:hidden">
              <div className="min-w-0">
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
                    const isSelected = dateKey === selectedDate && !isToday;

                    return (
                      <div
                        key={dateKey}
                        onClick={() => setSelectedDate(dateKey)}
                        className={
                          "min-h-[72px] border-b border-r border-border p-2 [&:nth-child(7n)]:border-r-0 " +
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
                            (isSelected ? " ring-2 ring-primary" : "")
                          }
                        >
                          {date.getDate()}
                        </span>
                        {dayEvents.length > 0 && (
                          <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
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
          </>
        )}

        {SHOW_UPCOMING_SCHEDULE_PANEL && (
          <div className="mt-6">
            <UpcomingSchedulePanel companies={companies} events={events} steps={steps} />
          </div>
        )}
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
