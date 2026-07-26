import Link from "next/link";
import { formatDateKey } from "@/lib/date";
import type { Company } from "@/lib/companies";

interface PriorityHighlightsProps {
  companies: Company[];
}

function diffInDays(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T00:00:00`);
  const to = new Date(`${toKey}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PriorityHighlights({ companies }: PriorityHighlightsProps) {
  const todayKey = formatDateKey(new Date());

  const highlights = companies
    .filter(
      (company): company is Company & { nextSchedule: string } =>
        company.priority === "높음" &&
        company.nextSchedule !== null &&
        company.nextSchedule >= todayKey
    )
    .sort((a, b) => (a.nextSchedule < b.nextSchedule ? -1 : 1));

  return (
    <section className="rounded-[10px] border border-border bg-card">
      <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
        놓치면 안 되는 일정
      </h2>

      {highlights.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-secondary">
          우선순위 높음으로 등록된 다가오는 일정이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {highlights.map((company) => (
            <li key={company.id}>
              <Link
                href={`/companies/${company.id}`}
                className="block px-6 py-4 hover:bg-background"
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span>🔥</span>
                  <span>{company.name}</span>
                </p>
                <p className="mt-1 text-sm text-foreground">{company.currentStep}</p>
                <p className="mt-1 text-sm text-secondary">
                  {company.nextSchedule.replace(/-/g, ".")} (D-
                  {diffInDays(todayKey, company.nextSchedule)})
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
