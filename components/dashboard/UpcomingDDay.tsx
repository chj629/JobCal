import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { diffInDays, todayKey, dateKeyOf } from "@/lib/date";
import type { Company } from "@/lib/companies";
import { EVENT_TYPE_BADGE_CLASS, EVENT_TYPE_LABELS, getNextEvent, type AppEvent } from "@/lib/events";

export interface UpcomingHighlight {
  company: Company;
  event: AppEvent;
  at: string;
}

// docs/database.md "다음 일정 계산" 규칙을 그대로 적용해 기업별로 다음 일정 하나씩 계산한다.
// UpcomingDDay와 통합 뷰(UpcomingSchedule)가 재사용한다.
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

interface UpcomingDDayProps {
  companies: Company[];
  events: AppEvent[];
}

export default function UpcomingDDay({ companies, events }: UpcomingDDayProps) {
  const today = todayKey();
  const highlights = getUpcomingHighlights(companies, events);

  return (
    <section className="rounded-[10px] border border-border bg-card">
      <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
        가까운 D-Day
      </h2>

      {highlights.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-secondary">
          다가오는 일정이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {highlights.map(({ company, event, at }) => (
            <li key={company.id}>
              <Link
                href={`/companies/${company.id}`}
                className="flex items-center gap-3 px-6 py-4 transition-colors duration-150 hover:bg-background"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{company.name}</p>
                  <p className="mt-1 truncate text-sm text-secondary">{event.title}</p>
                  <p className="mt-1 text-xs text-secondary">
                    {dateKeyOf(at).replace(/-/g, ".")} (D-{diffInDays(today, dateKeyOf(at))})
                  </p>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                    EVENT_TYPE_BADGE_CLASS[event.eventType]
                  }
                >
                  {EVENT_TYPE_LABELS[event.eventType]}
                </span>
                <ChevronRight size={16} className="shrink-0 text-secondary" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
