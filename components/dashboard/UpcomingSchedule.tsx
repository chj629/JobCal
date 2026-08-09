"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronRight } from "lucide-react";
import { getTodayResultsList } from "@/components/dashboard/TodayResults";
import { getUpcomingHighlights } from "@/components/dashboard/UpcomingDDay";
import { getUpcomingDeadlinesList } from "@/components/dashboard/UpcomingDeadlines";
import { dateKeyOf, diffInDays, formatTimeOfDay, todayKey } from "@/lib/date";
import { useLocale, useT } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";
import type { Company } from "@/lib/companies";
import type { AppEvent, EventType } from "@/lib/events";
import { getStepDisplayName, type ApplicationStep } from "@/lib/applicationSteps";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

interface UpcomingScheduleProps {
  companies: Company[];
  events: AppEvent[];
  steps: ApplicationStep[];
}

// 요일 약칭은 언어별로 통째로 다른 문자라 t()의 단일 문자열 치환 대신 locale별 배열로 둔다.
const WEEKDAY_LABELS: Record<Locale, string[]> = {
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  ko: ["일", "월", "화", "수", "목", "금", "토"],
};
const MAX_ROWS = 5;

// lib/events.ts의 EVENT_TYPE_LABELS(한국어 고정)는 그대로 두고, 기업 상세 단계에서 만든
// companies.events.types.* 키를 재사용해 표시 라벨만 번역한다.
const EVENT_TYPE_LABEL_KEYS: Record<EventType, string> = {
  schedule: "companies.events.types.schedule",
  deadline: "companies.events.types.deadline",
  result_announcement: "companies.events.types.resultAnnouncement",
};

// lib/events.ts의 EVENT_TYPE_BADGE_CLASS와 동일한 색 의미를 Badge variant로 재사용한다.
const EVENT_TYPE_BADGE_VARIANT: Record<EventType, BadgeVariant> = {
  schedule: "primary",
  deadline: "warning",
  result_announcement: "purple",
};

function formatRowDate(iso: string, t: (key: string) => string, weekdayLabels: string[]) {
  const key = dateKeyOf(iso);
  const diff = diffInDays(todayKey(), key);
  if (diff === 0) return t("dashboard.today");
  if (diff === 1) return t("dashboard.tomorrow");

  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} (${weekdayLabels[date.getDay()]})`;
}

// 6_homeAIOFF.png의 "직근 예정" 리스트. TodayResults/UpcomingDDay/UpcomingDeadlines의
// 기존 계산 함수를 그대로 재사용해 이벤트를 시간순으로 합친다. 같은 이벤트가 여러 계산에
// 동시에 걸리는 경우(예: 회사별 최근 일정과 마감 목록이 겹치는 경우)를 대비해 event.id
// 기준으로 중복만 제거하고, 필터링/정렬 로직 자체는 손대지 않는다.
export default function UpcomingSchedule({ companies, events, steps }: UpcomingScheduleProps) {
  const t = useT();
  const router = useRouter();
  const { locale } = useLocale();
  const weekdayLabels = WEEKDAY_LABELS[locale];
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

  return (
    <section className="flex h-[346px] flex-col rounded-[10px] border border-border bg-card">
      <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
        {t("dashboard.upcomingSchedule.title")}
      </h2>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <EmptyState icon={CalendarClock} title={t("dashboard.upcomingSchedule.empty")} />
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {rows.map(({ event, at }, index) => {
            const company = companies.find((c) => c.id === event.companyId);
            const step = steps.find((s) => s.id === event.applicationStepId);
            const isSoon = diffInDays(todayKey(), dateKeyOf(at)) <= 1;
            const isLast = index === rows.length - 1;

            return (
              <li key={event.id} className="transition-colors duration-150 hover:bg-background">
                <div className={"mx-4 " + (isLast ? "" : "border-b border-border")}>
                  <Link
                    href={`/companies/${event.companyId}`}
                    className="flex items-center gap-3 px-2 py-3"
                  >
                    <div className="w-16 shrink-0 self-start">
                      <p
                        className={
                          "text-sm font-semibold " + (isSoon ? "text-primary" : "text-secondary")
                        }
                      >
                        {formatRowDate(at, t, weekdayLabels)}
                      </p>
                      <p className="text-xs text-secondary">{formatTimeOfDay(at)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-foreground">
                          {company?.name ?? ""}
                        </p>
                        <Badge
                          variant={EVENT_TYPE_BADGE_VARIANT[event.eventType]}
                          size="sm"
                          className="shrink-0"
                        >
                          {t(EVENT_TYPE_LABEL_KEYS[event.eventType])}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-secondary">
                        {step ? getStepDisplayName(step, t) : event.title}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-secondary" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mx-6 pt-3 pb-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => router.push("/calendar")}
        >
          {t("dashboard.upcomingSchedule.viewMore")}
        </Button>
      </div>
    </section>
  );
}
