import { todayKey, dateKeyOf } from "@/lib/date";
import type { AppEvent } from "@/lib/events";

// 오늘 예정된 결과 발표만 추린다. 통합 뷰(UpcomingSchedule)가 재사용한다.
export function getTodayResultsList(events: AppEvent[]) {
  const today = todayKey();

  return events
    .filter((event) => event.eventType === "result_announcement" && event.dueAt !== null)
    .filter((event) => dateKeyOf(event.dueAt as string) === today)
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime());
}
