import Link from "next/link";
import { formatDateKey, dateKeyOf } from "@/lib/date";
import type { Company } from "@/lib/companies";
import { EVENT_TYPE_BADGE_CLASS, type AppEvent } from "@/lib/events";

interface SevenDayStripProps {
  companies: Company[];
  events: AppEvent[];
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_VISIBLE_EVENTS = 3;

export default function SevenDayStrip({ companies, events }: SevenDayStripProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateKey = formatDateKey(date);
    const dayEvents = events
      .filter((event) => {
        const at = event.startsAt ?? event.dueAt;
        return at !== null && dateKeyOf(at) === dateKey;
      })
      .sort((a, b) => {
        const atA = (a.startsAt ?? a.dueAt) as string;
        const atB = (b.startsAt ?? b.dueAt) as string;
        return new Date(atA).getTime() - new Date(atB).getTime();
      });

    return {
      date,
      dateKey,
      isToday: i === 0,
      dayEvents,
    };
  });

  return (
    <section className="rounded-[10px] border border-border bg-card p-4">
      <h2 className="mb-4 px-2 text-[16px] font-semibold text-foreground">오늘부터 7일</h2>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:overflow-visible">
        {days.map((day) => (
          <div
            key={day.dateKey}
            className={
              "flex min-h-[120px] w-[110px] shrink-0 flex-col gap-1 rounded-[8px] border p-2 sm:w-auto sm:shrink " +
              (day.isToday ? "border-primary bg-primary/5" : "border-border")
            }
          >
            <div className="flex items-baseline justify-between">
              <span
                className={
                  "text-xs font-semibold " + (day.isToday ? "text-primary" : "text-secondary")
                }
              >
                {day.isToday ? "오늘" : WEEKDAY_LABELS[day.date.getDay()]}
              </span>
              <span className="text-xs text-secondary">{day.date.getDate()}일</span>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              {day.dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => {
                const company = companies.find((c) => c.id === event.companyId);
                return (
                  <Link
                    key={event.id}
                    href={`/companies/${event.companyId}`}
                    title={`${company?.name ?? ""} · ${event.title}`}
                    className={
                      "truncate rounded-[4px] px-1.5 py-1 text-[11px] hover:opacity-80 " +
                      EVENT_TYPE_BADGE_CLASS[event.eventType]
                    }
                  >
                    {company?.name ?? ""}
                  </Link>
                );
              })}
              {day.dayEvents.length > MAX_VISIBLE_EVENTS && (
                <span className="px-1.5 text-[11px] text-secondary">
                  +{day.dayEvents.length - MAX_VISIBLE_EVENTS}개
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
