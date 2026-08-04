import type { Company } from "@/lib/companies";
import { getNextEvent, type AppEvent } from "@/lib/events";

export interface UpcomingHighlight {
  company: Company;
  event: AppEvent;
  at: string;
}

// docs/database.md "다음 일정 계산" 규칙을 그대로 적용해 기업별로 다음 일정 하나씩 계산한다.
// 통합 뷰(UpcomingSchedule)가 재사용한다.
export function getUpcomingHighlights(companies: Company[], events: AppEvent[]): UpcomingHighlight[] {
  return companies
    .map((company) => {
      const companyEvents = events.filter((event) => event.companyId === company.id);
      const nextEvent = getNextEvent(companyEvents);
      const at = nextEvent ? (nextEvent.startsAt ?? nextEvent.dueAt) : null;
      return at ? { company, event: nextEvent!, at } : null;
    })
    .filter((entry): entry is UpcomingHighlight => entry !== null)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
