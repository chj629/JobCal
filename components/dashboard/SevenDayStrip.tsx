import Link from "next/link";
import { formatDateKey } from "@/lib/date";
import type { Company } from "@/lib/companies";

interface SevenDayStripProps {
  companies: Company[];
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export default function SevenDayStrip({ companies }: SevenDayStripProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateKey = formatDateKey(date);
    return {
      date,
      dateKey,
      isToday: i === 0,
      dayCompanies: companies.filter((company) => company.nextSchedule === dateKey),
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
              {day.dayCompanies.map((company) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  title={`${company.name} · ${company.currentStep}`}
                  className="truncate rounded-[4px] bg-primary/10 px-1.5 py-1 text-[11px] text-primary hover:bg-primary/20"
                >
                  {company.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
