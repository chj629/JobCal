import Link from "next/link";
import { todayKey, dateKeyOf } from "@/lib/date";
import type { Company } from "@/lib/companies";
import type { AppEvent } from "@/lib/events";

interface TodayResultsProps {
  companies: Company[];
  events: AppEvent[];
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TodayResults({ companies, events }: TodayResultsProps) {
  const today = todayKey();

  const todayResults = events
    .filter((event) => event.eventType === "result_announcement" && event.dueAt !== null)
    .filter((event) => dateKeyOf(event.dueAt as string) === today)
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime());

  return (
    <section className="rounded-[10px] border border-border bg-card">
      <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
        오늘 결과 발표
      </h2>

      {todayResults.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-secondary">
          오늘 예정된 결과 발표가 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {todayResults.map((event) => {
            const company = companies.find((c) => c.id === event.companyId);

            return (
              <li key={event.id}>
                <Link
                  href={`/companies/${event.companyId}`}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-background"
                >
                  <span className="w-14 shrink-0 text-sm font-semibold text-joined">
                    {formatTime(event.dueAt as string)}
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
