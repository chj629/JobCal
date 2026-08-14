"use client";

import { useRouter } from "next/navigation";
import { getTodaySchedules } from "@/components/dashboard/TodayTimetable";
import { formatTimeOfDay } from "@/lib/date";
import { useLocale, useT } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";
import type { Company } from "@/lib/companies";
import type { AppEvent } from "@/lib/events";
import EmptyState from "@/components/ui/EmptyState";
import MaterialIcon from "@/components/ui/MaterialIcon";
import ScrollFade from "@/components/ui/ScrollFade";
import { useScrollFade } from "@/lib/useScrollFade";

interface TodayScheduleProps {
  companies: Company[];
  events: AppEvent[];
}

const WEEKDAY_LABELS: Record<Locale, string[]> = {
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  ko: ["일", "월", "화", "수", "목", "금", "토"],
};

// 현재 시각 이후 중 가장 가까운 항목을 찾는다. 렌더 함수 밖의 순수 함수로 분리해
// react-hooks/purity(렌더 중 Date.now() 직접 호출 금지) 규칙을 지킨다.
function findNextIndex(schedules: AppEvent[]): number {
  const now = Date.now();
  return schedules.findIndex(
    (event) => event.startsAt !== null && new Date(event.startsAt).getTime() >= now
  );
}

// docs/stitch/메인페이지 5개/jobcal_dashboard_added_weekly_progress_summary의 "本日の予定" 카드.
// 시간이 있는 일정(event_type=schedule)만 다룬다. 오늘 마감 체크리스트는
// TodayChecklist.tsx의 카드가 별도로 담당한다(Stitch가 두 카드를 분리해서 보여줌).
export default function TodaySchedule({ companies, events }: TodayScheduleProps) {
  const t = useT();
  const router = useRouter();
  const { locale } = useLocale();
  const weekdayLabels = WEEKDAY_LABELS[locale];
  const todaySchedules = getTodaySchedules(events);
  const nextIndex = findNextIndex(todaySchedules);

  const now = new Date();
  const dateLabel = t("dashboard.todaySchedule.dateLabel", {
    month: now.getMonth() + 1,
    day: now.getDate(),
    weekday: weekdayLabels[now.getDay()],
  });
  const { scrollRef, canScrollDown, onScroll } = useScrollFade([todaySchedules.length]);

  return (
    <div className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
          <MaterialIcon name="calendar_today" size={17} className="text-secondary" />
          {t("dashboard.todaySchedule.title")}
        </h3>
        <span className="text-[12px] text-secondary">{dateLabel}</span>
      </div>

      {todaySchedules.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="calendar_today" title={t("dashboard.todaySchedule.empty")} />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full space-y-1.5 overflow-y-auto overflow-x-hidden stitch-scrollbar-hidden pr-1"
        >
          {todaySchedules.map((event, index) => {
            const company = companies.find((c) => c.id === event.companyId);
            const isNext = index === nextIndex;

            return (
              <div
                key={event.id}
                className="-mx-2 flex items-start gap-3 rounded-stitch-xl px-2 py-1.5 transition-colors hover:bg-black/[0.015]"
              >
                <div className="flex w-10 shrink-0 flex-col items-end pt-0.5">
                  <p className="text-[14px] font-[400] leading-none tracking-tight text-stitch-ink">
                    {event.startsAt ? formatTimeOfDay(event.startsAt) : ""}
                  </p>
                  {event.endsAt && (
                    <p className="mt-1 text-[11px] leading-none tracking-tight text-secondary">
                      {formatTimeOfDay(event.endsAt)}
                    </p>
                  )}
                </div>
                <div
                  className={
                    "flex min-w-0 flex-1 flex-col gap-0.5 border-l-[3px] py-0.5 pl-3 " +
                    (isNext ? "border-primary-navy" : "border-stitch-border")
                  }
                >
                  <div className="flex items-center gap-1">
                    <p className="truncate text-[14px] font-[400] leading-tight text-stitch-ink">
                      {event.title}
                    </p>
                    {isNext && (
                      <MaterialIcon
                        name="check_circle"
                        size={14}
                        filled
                        className="shrink-0 text-primary-navy"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-secondary">{company?.name ?? ""}</p>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollFade visible={canScrollDown} />
        </div>
      )}

      <div className="mt-2 flex shrink-0 justify-end">
        <button
          type="button"
          onClick={() => router.push("/calendar")}
          className="flex items-center gap-0.5 text-[12px] font-[400] text-primary-navy transition-colors hover:opacity-80"
        >
          {t("dashboard.todaySchedule.viewAll")}
          <MaterialIcon name="chevron_right" size={15} />
        </button>
      </div>
    </div>
  );
}
