"use client";

import { dateKeyOf, diffInDays, todayKey } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import type { AppEvent } from "@/lib/events";

interface CalendarWeeklyProgressProps {
  events: AppEvent[];
  checkedIds: Set<string>;
}

// docs/stitch/메인페이지 5개/jobcal_calendar_*의 좌측 "今週の進捗" 카드. 대시보드의
// WeeklyProgress.tsx(마감 1개 지표, 얇은 가로 바)와 달리 이 화면은 "面接・選考"(오늘부터
// 7일 이내 일정 이벤트)와 "ES提出"(같은 기간 마감 이벤트) 두 지표를 따로 보여준다.
// checkedIds는 calendar/page.tsx가 useEventCompletions()를 한 번만 호출해 내려준다 —
// TodayEventsCard/EventDetailPopover와 같은 상태를 공유해야 체크 직후 진행률이 즉시 갱신된다.
export default function CalendarWeeklyProgress({ events, checkedIds }: CalendarWeeklyProgressProps) {
  const t = useT();

  const today = todayKey();
  const weekEvents = events.filter((event) => {
    const at = event.startsAt ?? event.dueAt;
    if (!at) return false;
    const diff = diffInDays(today, dateKeyOf(at));
    return diff >= 0 && diff <= 6;
  });

  const interviewEvents = weekEvents.filter((event) => event.eventType === "schedule");
  const esEvents = weekEvents.filter((event) => event.eventType === "deadline");
  const interviewDone = interviewEvents.filter((event) => checkedIds.has(event.id)).length;
  const esDone = esEvents.filter((event) => checkedIds.has(event.id)).length;

  function percentOf(done: number, total: number) {
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  return (
    <div className="rounded-stitch-2xl border border-stitch-border bg-card p-5 shadow-sm">
      <h4 className="mb-3 text-[14px] font-[400] text-stitch-ink">{t("dashboard.weeklyProgress.title")}</h4>
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-secondary">{t("calendar.weeklyProgress.interview")}</span>
            <span className="font-[400] text-stitch-ink">
              {t("dashboard.weeklyProgress.completed", { done: interviewDone, total: interviewEvents.length })}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stitch-border">
            <div
              className="h-full rounded-full bg-primary-navy"
              style={{ width: `${percentOf(interviewDone, interviewEvents.length)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-secondary">{t("calendar.weeklyProgress.esSubmission")}</span>
            <span className="font-[400] text-stitch-ink">
              {t("dashboard.weeklyProgress.completed", { done: esDone, total: esEvents.length })}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-stitch-border">
            <div
              className="h-full rounded-full bg-[#64a8fe]"
              style={{ width: `${percentOf(esDone, esEvents.length)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
