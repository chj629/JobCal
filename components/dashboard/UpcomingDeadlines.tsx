import { formatDateKeyInAsiaTokyo, todayKeyInAsiaTokyo } from "@/lib/date";
import type { AppEvent } from "@/lib/events";

// 오늘 마감은 "오늘 해야 할 일"에서 이미 다루므로, 여기서는 내일 이후만 표시한다.
// 통합 뷰(UpcomingSchedule)가 재사용한다.
export function getUpcomingDeadlinesList(events: AppEvent[]) {
  const today = todayKeyInAsiaTokyo();
  const now = new Date().getTime();

  return events
    .filter((event) => event.eventType === "deadline" && event.dueAt !== null)
    .filter((event) => {
      const dueAt = event.dueAt as string;
      return (
        new Date(dueAt).getTime() >= now && formatDateKeyInAsiaTokyo(dueAt) !== today
      );
    })
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime());
}
