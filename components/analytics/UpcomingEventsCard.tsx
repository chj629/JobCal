"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { Company } from "@/lib/companies";
import type { ApplicationStep } from "@/lib/applicationSteps";
import { dateKeyOf, diffInDays, todayKey } from "@/lib/date";
import { useLocale, useT } from "@/lib/locale-context";
import type { AppEvent, EventType } from "@/lib/events";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

interface UpcomingEventsCardProps {
  companies: Company[];
  events: AppEvent[];
  steps: ApplicationStep[];
}

const MAX_ROWS = 5;

// lib/events.ts의 EVENT_TYPE_BADGE_CLASS와 동일한 색 의미를 Badge variant로 재사용한다
// (calendar/page.tsx, CompanySchedulePanel.tsx 등과 동일한 매핑).
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

// 11_analytics.png "D-Day" 카드. 기존 이벤트 데이터와 CompanySchedulePanel.tsx의
// D-day 계산 규칙을 그대로 재사용해, 오늘 이후 일정을 가까운 순으로 최대 5건 보여준다.
export default function UpcomingEventsCard({ companies, events, steps }: UpcomingEventsCardProps) {
  const t = useT();
  const { locale } = useLocale();
  const localeCode = locale === "ja" ? "ja-JP" : "ko-KR";
  const today = todayKey();

  const rows = events
    .map((event) => ({ event, at: event.startsAt ?? event.dueAt }))
    .filter((row): row is { event: AppEvent; at: string } => row.at !== null)
    .filter((row) => diffInDays(today, dateKeyOf(row.at)) >= 0)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, MAX_ROWS);

  function formatDDay(at: string) {
    const diff = diffInDays(today, dateKeyOf(at));
    if (diff === 0) return t("dashboard.today");
    if (diff === 1) return t("dashboard.tomorrow");
    return t("companies.detail.schedulePanel.dDay", { days: diff });
  }

  return (
    <section className="rounded-[10px] border border-border bg-card p-6">
      <h2 className="text-[16px] font-semibold text-foreground">
        {t("analytics.upcomingEvents.title")}
      </h2>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t("analytics.upcomingEvents.empty")} />
      ) : (
        <ul className="mt-4">
          {rows.map(({ event, at }, index) => {
            const company = companies.find((c) => c.id === event.companyId);
            const stepName = steps.find((s) => s.id === event.applicationStepId)?.name;
            const isLast = index === rows.length - 1;

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
      )}
    </section>
  );
}
