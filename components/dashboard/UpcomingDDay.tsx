import Link from "next/link";
import { todayKey, dateKeyOf } from "@/lib/date";
import type { Company } from "@/lib/companies";
import { getNextEvent, type AppEvent } from "@/lib/events";

interface UpcomingDDayProps {
  companies: Company[];
  events: AppEvent[];
}

function diffInDays(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T00:00:00`);
  const to = new Date(`${toKey}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export default function UpcomingDDay({ companies, events }: UpcomingDDayProps) {
  const today = todayKey();

  // docs/database.md "다음 일정 계산" 규칙을 그대로 적용해 기업별로 다음 일정 하나씩 계산한다.
  const highlights = companies
    .map((company) => {
      const companyEvents = events.filter((event) => event.companyId === company.id);
      const nextEvent = getNextEvent(companyEvents);
      const at = nextEvent ? (nextEvent.startsAt ?? nextEvent.dueAt) : null;
      return at ? { company, event: nextEvent!, at } : null;
    })
    .filter((entry): entry is { company: Company; event: AppEvent; at: string } => entry !== null)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

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
                className="block px-6 py-4 hover:bg-background"
              >
                <p className="text-sm font-semibold text-foreground">{company.name}</p>
                <p className="mt-1 text-sm text-foreground">{event.title}</p>
                <p className="mt-1 text-sm text-secondary">
                  {dateKeyOf(at).replace(/-/g, ".")} (D-{diffInDays(today, dateKeyOf(at))})
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
