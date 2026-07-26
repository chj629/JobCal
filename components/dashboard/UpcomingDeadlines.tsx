import Link from "next/link";
import { todayKey, dateKeyOf } from "@/lib/date";
import type { Company } from "@/lib/companies";
import type { AppEvent } from "@/lib/events";

interface UpcomingDeadlinesProps {
  companies: Company[];
  events: AppEvent[];
}

function diffInDays(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T00:00:00`);
  const to = new Date(`${toKey}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export default function UpcomingDeadlines({ companies, events }: UpcomingDeadlinesProps) {
  const today = todayKey();
  const now = new Date().getTime();

  // 오늘 마감은 "오늘 해야 할 일"에서 이미 다루므로, 여기서는 내일 이후만 표시한다.
  const upcoming = events
    .filter((event) => event.eventType === "deadline" && event.dueAt !== null)
    .filter((event) => {
      const dueAt = event.dueAt as string;
      return new Date(dueAt).getTime() >= now && dateKeyOf(dueAt) !== today;
    })
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime());

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
                  className="flex items-center gap-4 px-6 py-3 hover:bg-background"
                >
                  <span className="w-14 shrink-0 text-sm font-semibold text-warning">
                    D-{diffInDays(today, dueKey)}
                  </span>
                  <span className="text-sm font-medium text-foreground">{company?.name ?? ""}</span>
                  <span className="text-sm text-secondary">{event.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
