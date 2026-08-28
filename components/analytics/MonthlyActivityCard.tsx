"use client";

import MaterialIcon from "@/components/ui/MaterialIcon";
import type { Company } from "@/lib/companies";
import type { AppEvent } from "@/lib/events";
import { formatDateKeyInAsiaTokyo, todayKeyInAsiaTokyo } from "@/lib/date";
import { useT } from "@/lib/locale-context";

interface MonthlyActivityCardProps {
  companies: Company[];
  events: AppEvent[];
}

// 이번 달(YYYY-MM) 여부만 비교하면 되므로 dateKey의 앞 7자리만 잘라 비교한다.
function isThisMonth(dateKey: string, currentMonthKey: string): boolean {
  return dateKey.slice(0, 7) === currentMonthKey;
}

// docs/stitch/메인페이지 5개/jobcal_analytics_standardized_design_refresh에는 없는 신규
// 카드. companies.createdAt/events.startsAt·dueAt만으로 계산 가능한, "이번 달에 실제로
// 얼마나 활동했는지"를 보여준다. 기존 2x2 그리드 카드와 동일한 셸(h-[340px]/p-6/radius)을
// 그대로 재사용한다.
export default function MonthlyActivityCard({ companies, events }: MonthlyActivityCardProps) {
  const t = useT();
  const currentMonthKey = todayKeyInAsiaTokyo().slice(0, 7);

  const newApplications = companies.filter((c) => isThisMonth(c.createdAt, currentMonthKey)).length;

  const scheduledEvents = events.filter(
    (e) =>
      e.eventType === "schedule" &&
      e.startsAt &&
      isThisMonth(formatDateKeyInAsiaTokyo(e.startsAt), currentMonthKey)
  ).length;

  const deadlines = events.filter(
    (e) =>
      e.eventType === "deadline" &&
      e.dueAt &&
      isThisMonth(formatDateKeyInAsiaTokyo(e.dueAt), currentMonthKey)
  ).length;

  const rows = [
    { icon: "domain_add", label: t("analytics.monthlyActivity.newApplications"), count: newApplications },
    { icon: "event", label: t("analytics.monthlyActivity.scheduledEvents"), count: scheduledEvents },
    { icon: "flag", label: t("analytics.monthlyActivity.deadlines"), count: deadlines },
  ];

  return (
    <section className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <h2 className="mb-6 flex items-center gap-2 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="calendar_month" size={17} className="text-secondary" />
        {t("analytics.monthlyActivity.title")}
      </h2>

      <div className="flex flex-1 flex-col justify-center gap-6">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MaterialIcon name={row.icon} size={16} className="text-secondary" />
              <span className="text-[13px] text-stitch-ink">{row.label}</span>
            </div>
            <span className="text-[20px] font-[400] tracking-tight text-stitch-ink">{row.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
