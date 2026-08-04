import { todayKey, dateKeyOf } from "@/lib/date";
import type { AppEvent } from "@/lib/events";

// 오늘 시간이 등록된 일정만 추린다. 통합 뷰(TodaySchedule)가 재사용한다.
export function getTodaySchedules(events: AppEvent[]) {
  const today = todayKey();

  return events
    .filter((event) => event.eventType === "schedule" && event.startsAt !== null)
    .filter((event) => dateKeyOf(event.startsAt as string) === today)
    .sort(
      (a, b) => new Date(a.startsAt as string).getTime() - new Date(b.startsAt as string).getTime()
    );
}
