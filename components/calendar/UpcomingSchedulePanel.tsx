"use client";

import Link from "next/link";
import type { Company } from "@/lib/companies";
import type { ApplicationStep } from "@/lib/applicationSteps";
import type { AppEvent, EventType } from "@/lib/events";
import { dateKeyOf, diffInDays, todayKey } from "@/lib/date";
import { useLocale, useT } from "@/lib/locale-context";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";

interface UpcomingSchedulePanelProps {
  companies: Company[];
  events: AppEvent[];
  steps: ApplicationStep[];
}

const MAX_UPCOMING_ROWS = 5;

// calendar/page.tsx, UpcomingEventsCard.tsx와 동일한 타입별 배지 색/라벨 매핑을 재사용한다.
const EVENT_TYPE_BADGE_VARIANT: Record<EventType, BadgeVariant> = {
  schedule: "primary",
  deadline: "warning",
  result_announcement: "purple",
};

const EVENT_TYPE_LABEL_KEYS: Record<EventType, string> = {
  schedule: "companies.events.types.schedule",
  deadline: "companies.events.types.deadline",
  result_announcement: "companies.events.types.resultAnnouncement",
};

interface Row {
  event: AppEvent;
  at: string;
}

// 10_calendar.png 우측 패널. "오늘의 일정"/"다가오는 일정" 타이틀과 빈 상태 문구는
// 대시보드의 동일한 위젯(dashboard.todaySchedule / dashboard.upcomingSchedule)과
// 같은 의미이므로 새 키를 만들지 않고 그대로 재사용한다.
export default function UpcomingSchedulePanel({
  companies,
  events,
  steps,
}: UpcomingSchedulePanelProps) {
  const t = useT();
  const { locale } = useLocale();
  const localeCode = locale === "ja" ? "ja-JP" : "ko-KR";
  const today = todayKey();

  const rows: Row[] = events
    .map((event) => ({ event, at: event.startsAt ?? event.dueAt }))
    .filter((row): row is Row => row.at !== null)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const todayRows = rows.filter((row) => dateKeyOf(row.at) === today);
  const upcomingRows = rows
    .filter((row) => dateKeyOf(row.at) > today)
    .slice(0, MAX_UPCOMING_ROWS);

  function formatDDay(at: string) {
    const diff = diffInDays(today, dateKeyOf(at));
    if (diff === 0) return t("dashboard.today");
    if (diff === 1) return t("dashboard.tomorrow");
    return t("companies.detail.schedulePanel.dDay", { days: diff });
  }

  function renderRows(rowsToRender: Row[], emptyText: string) {
    if (rowsToRender.length === 0) {
      return <p className="px-6 py-8 text-center text-sm text-secondary">{emptyText}</p>;
    }

    return (
      <ul>
        {rowsToRender.map(({ event, at }, index) => {
          const company = companies.find((c) => c.id === event.companyId);
          const stepName = steps.find((s) => s.id === event.applicationStepId)?.name;
          const isLast = index === rowsToRender.length - 1;

          return (
            <li key={event.id} className="transition-colors duration-150 hover:bg-background">
              <div className={"mx-4 " + (isLast ? "" : "border-b border-border")}>
                <Link href={`/companies/${event.companyId}`} className="block px-2 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={EVENT_TYPE_BADGE_VARIANT[event.eventType]} size="sm">
                      {t(EVENT_TYPE_LABEL_KEYS[event.eventType])}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      {formatDDay(at)}
                    </Badge>
                  </div>
                  <p className="mt-2 truncate text-sm font-bold text-foreground">
                    {company?.name ?? ""}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-secondary">
                    {stepName ?? event.title} ·{" "}
                    {new Date(at).toLocaleString(localeCode, {
                      month: "2-digit",
                      day: "2-digit",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-border bg-card">
        <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
          {t("dashboard.todaySchedule.title")}
        </h2>
        {renderRows(todayRows, t("dashboard.todaySchedule.empty"))}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
          {t("dashboard.upcomingSchedule.title")}
        </h2>
        {renderRows(upcomingRows, t("dashboard.upcomingSchedule.empty"))}
      </section>
    </div>
  );
}
