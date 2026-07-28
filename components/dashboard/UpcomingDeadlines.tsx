import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { diffInDays, todayKey, dateKeyOf } from "@/lib/date";
import type { Company } from "@/lib/companies";
import type { AppEvent } from "@/lib/events";

// 오늘 마감은 "오늘 해야 할 일"에서 이미 다루므로, 여기서는 내일 이후만 표시한다.
// UpcomingDeadlines와 통합 뷰(UpcomingSchedule)가 재사용한다.
export function getUpcomingDeadlinesList(events: AppEvent[]) {
  const today = todayKey();
  const now = new Date().getTime();

  return events
    .filter((event) => event.eventType === "deadline" && event.dueAt !== null)
    .filter((event) => {
      const dueAt = event.dueAt as string;
      return new Date(dueAt).getTime() >= now && dateKeyOf(dueAt) !== today;
    })
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime());
}

interface UpcomingDeadlinesProps {
  companies: Company[];
  events: AppEvent[];
}

export default function UpcomingDeadlines({ companies, events }: UpcomingDeadlinesProps) {
  const today = todayKey();
  const upcoming = getUpcomingDeadlinesList(events);

  return (
    <section className="rounded-[10px] border border-border bg-card">
      <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
        마감 임박 일정
      </h2>

      {upcoming.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-secondary">
          다가오는 마감 일정이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {upcoming.map((event) => {
            const company = companies.find((c) => c.id === event.companyId);
            const dueKey = dateKeyOf(event.dueAt as string);

            return (
              <li key={event.id}>
                <Link
                  href={`/companies/${event.companyId}`}
                  className="flex items-center gap-4 px-6 py-3 transition-colors duration-150 hover:bg-background"
                >
                  <span className="w-14 shrink-0 text-sm font-semibold text-warning">
                    D-{diffInDays(today, dueKey)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {company?.name ?? ""}
                    </p>
                    <p className="truncate text-xs text-secondary">{event.title}</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-secondary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
