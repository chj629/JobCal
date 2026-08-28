import { formatDateKeyInAsiaTokyo, todayKeyInAsiaTokyo } from "@/lib/date";
import type { AppEvent } from "@/lib/events";

// 오늘 예정된 결과 발표만 추린다. 통합 뷰(UpcomingSchedule)가 재사용한다.
export function getTodayResultsList(events: AppEvent[]) {
  const today = todayKeyInAsiaTokyo();

  return events
    .filter((event) => event.eventType === "result_announcement" && event.dueAt !== null)
    .filter((event) => formatDateKeyInAsiaTokyo(event.dueAt as string) === today)
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime());
}
