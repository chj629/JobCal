"use client";

import { useRouter } from "next/navigation";
import { getTodayResultsList } from "@/components/dashboard/TodayResults";
import { getUpcomingHighlights } from "@/components/dashboard/UpcomingDDay";
import { getUpcomingDeadlinesList } from "@/components/dashboard/UpcomingDeadlines";
import { dateKeyOf, diffInDays, formatTimeOfDay, todayKey } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import type { Company } from "@/lib/companies";
import type { AppEvent } from "@/lib/events";
import { getStepDisplayName, type ApplicationStep } from "@/lib/applicationSteps";
import EmptyState from "@/components/ui/EmptyState";
import MaterialIcon from "@/components/ui/MaterialIcon";
import ScrollFade from "@/components/ui/ScrollFade";
import { useScrollFade } from "@/lib/useScrollFade";

interface UpcomingScheduleProps {
  companies: Company[];
  events: AppEvent[];
  steps: ApplicationStep[];
}

const MAX_ROWS = 5;

function formatRelativeBadge(at: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const today = todayKey();
  const diff = diffInDays(today, dateKeyOf(at));

  if (diff <= 0) {
    const hoursLeft = Math.max(1, Math.ceil((new Date(at).getTime() - Date.now()) / (1000 * 60 * 60)));
    return { label: t("dashboard.upcomingSchedule.hoursLeft", { hours: hoursLeft }), urgent: true };
  }

  if (diff === 1) {
    return {
      label: t("dashboard.upcomingSchedule.tomorrowAt", { time: formatTimeOfDay(at) }),
      urgent: false,
    };
  }

  const date = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    label: t("dashboard.upcomingSchedule.dateAt", {
      date: `${pad(date.getMonth() + 1)}.${pad(date.getDate())}`,
      time: formatTimeOfDay(at),
    }),
    urgent: false,
  };
}

// docs/stitch/메인페이지 5개/jobcal_dashboard_added_weekly_progress_summary의 "今後の予定" 카드.
// TodayResults/UpcomingDDay/UpcomingDeadlines의 기존 계산 함수를 그대로 재사용해 이벤트를
// 시간순으로 합친다(오늘 마감은 TodayChecklist 카드가 담당하므로 여기서는 제외됨).
export default function UpcomingSchedule({ companies, events, steps }: UpcomingScheduleProps) {
  const t = useT();
  const router = useRouter();
  const combined = new Map<string, { event: AppEvent; at: string }>();

  for (const event of getTodayResultsList(events)) {
    combined.set(event.id, { event, at: event.dueAt as string });
  }
  for (const event of getUpcomingDeadlinesList(events)) {
    combined.set(event.id, { event, at: event.dueAt as string });
  }
  for (const { event, at } of getUpcomingHighlights(companies, events)) {
    combined.set(event.id, { event, at });
  }

  const rows = Array.from(combined.values())
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, MAX_ROWS);
  const { scrollRef, canScrollDown, onScroll } = useScrollFade([rows.length]);

  return (
    <div className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <h3 className="mb-3 flex shrink-0 items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="schedule" size={17} className="text-secondary" />
        {t("dashboard.upcomingSchedule.title")}
      </h3>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="schedule" title={t("dashboard.upcomingSchedule.empty")} />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full space-y-1.5 overflow-y-auto overflow-x-hidden stitch-scrollbar-hidden pr-1"
        >
          {rows.map(({ event, at }) => {
            const company = companies.find((c) => c.id === event.companyId);
            const step = steps.find((s) => s.id === event.applicationStepId);
            const badge = formatRelativeBadge(at, t);

            return (
              <div
                key={event.id}
                className="-mx-2 flex items-center justify-between gap-3 rounded-stitch-xl p-2 transition-colors hover:bg-black/[0.015]"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-[12px] text-secondary">{company?.name ?? ""}</p>
                  <p className="truncate text-[14px] font-[400] leading-tight text-stitch-ink">
                    {step ? getStepDisplayName(step, t) : event.title}
                  </p>
                </div>
                <span
                  className={
                    "shrink-0 whitespace-nowrap rounded-stitch-md px-2 py-1 text-[11px] font-[400] " +
                    (badge.urgent
                      ? "bg-error/10 text-error"
                      : "border border-stitch-border bg-background text-secondary")
                  }
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
        <ScrollFade visible={canScrollDown} />
        </div>
      )}

      <div className="mt-2 flex shrink-0 justify-end">
        <button
          type="button"
          onClick={() => router.push("/calendar")}
          className="flex items-center gap-0.5 text-[12px] font-[400] text-primary-navy transition-colors hover:opacity-80"
        >
          {t("dashboard.upcomingSchedule.viewAll")}
          <MaterialIcon name="chevron_right" size={15} />
        </button>
      </div>
    </div>
  );
}
