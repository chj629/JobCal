import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { todayKey, dateKeyOf, formatTimeOfDay } from "@/lib/date";
import type { Company } from "@/lib/companies";
import { EVENT_TYPE_BADGE_CLASS, EVENT_TYPE_LABELS, type AppEvent } from "@/lib/events";

// 오늘 시간이 등록된 일정만 추린다. TodayTimetable과 통합 뷰(TodaySchedule)가 재사용한다.
export function getTodaySchedules(events: AppEvent[]) {
  const today = todayKey();

  return events
    .filter((event) => event.eventType === "schedule" && event.startsAt !== null)
    .filter((event) => dateKeyOf(event.startsAt as string) === today)
    .sort(
      (a, b) => new Date(a.startsAt as string).getTime() - new Date(b.startsAt as string).getTime()
    );
}

interface TodayTimetableProps {
  companies: Company[];
  events: AppEvent[];
}

export default function TodayTimetable({ companies, events }: TodayTimetableProps) {
  const todaySchedules = getTodaySchedules(events);

  return (
    <section className="rounded-[10px] border border-border bg-card">
      <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
        오늘 시간표
      </h2>

      {todaySchedules.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-secondary">
          오늘 시간이 등록된 일정이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {todaySchedules.map((event) => {
            const company = companies.find((c) => c.id === event.companyId);

            return (
              <li key={event.id}>
                <Link
                  href={`/companies/${event.companyId}`}
                  className="flex items-center gap-3 px-6 py-3 transition-colors duration-150 hover:bg-background"
                >
                  <span className="w-14 shrink-0 text-sm font-semibold text-primary">
                    {formatTimeOfDay(event.startsAt as string)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {company?.name ?? ""}
                    </p>
                    <p className="truncate text-xs text-secondary">{event.title}</p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                      EVENT_TYPE_BADGE_CLASS.schedule
                    }
                  >
                    {EVENT_TYPE_LABELS.schedule}
                  </span>
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
