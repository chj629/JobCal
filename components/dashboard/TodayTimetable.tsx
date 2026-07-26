import Link from "next/link";
import { todayKey } from "@/lib/date";
import type { Company } from "@/lib/companies";

interface TodayTimetableProps {
  companies: Company[];
}

export default function TodayTimetable({ companies }: TodayTimetableProps) {
  const today = todayKey();

  const timed = companies
    .filter(
      (company): company is Company & { nextScheduleTime: string } =>
        company.nextSchedule === today && company.nextScheduleTime !== null
    )
    .sort((a, b) => (a.nextScheduleTime < b.nextScheduleTime ? -1 : 1));

  return (
    <section className="rounded-[10px] border border-border bg-card">
      <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
        오늘 시간표
      </h2>

      {timed.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-secondary">
          오늘 시간이 등록된 일정이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {timed.map((company) => (
            <li key={company.id}>
              <Link
                href={`/companies/${company.id}`}
                className="flex items-center gap-3 px-6 py-3 hover:bg-background"
              >
                <span className="w-14 shrink-0 text-sm font-semibold text-primary">
                  {company.nextScheduleTime}
                </span>
                <span className="text-sm font-medium text-foreground">{company.name}</span>
                <span className="text-sm text-secondary">{company.currentStep}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
