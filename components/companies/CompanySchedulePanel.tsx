"use client";

import { CalendarClock } from "lucide-react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { useEvents } from "@/lib/events-context";
import type { AppEvent, EventType } from "@/lib/events";
import { dateKeyOf, diffInDays, todayKey } from "@/lib/date";
import { useLocale, useT } from "@/lib/locale-context";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

interface CompanySchedulePanelProps {
  companyId: string;
}

// lib/events.ts의 EVENT_TYPE_BADGE_CLASS(캘린더 화면 배지 색)와 동일한 의미를 Badge variant로 재사용한다.
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

// 읽기 전용 요약 패널. 추가/편집/삭제는 StepDetailPanel의 기존 일정 관리 UI를 그대로 사용한다.
export default function CompanySchedulePanel({ companyId }: CompanySchedulePanelProps) {
  const t = useT();
  const { locale } = useLocale();
  const { steps } = useApplicationSteps();
  const { events } = useEvents();

  const companySteps = steps.filter((step) => step.companyId === companyId);

  // 날짜가 없는 이벤트(시작/마감일을 아직 입력하지 않은 경우)는 시간순 목록에 의미가 없어 제외한다.
  const rows = events
    .filter((event) => event.companyId === companyId)
    .map((event) => ({ event, at: event.startsAt ?? event.dueAt }))
    .filter((row): row is { event: AppEvent; at: string } => row.at !== null)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const localeCode = locale === "ja" ? "ja-JP" : "ko-KR";
  const today = todayKey();

  function formatDDay(at: string) {
    const diff = diffInDays(today, dateKeyOf(at));
    if (diff < 0) return null;
    if (diff === 0) return t("dashboard.today");
    if (diff === 1) return t("dashboard.tomorrow");
    return t("companies.detail.schedulePanel.dDay", { days: diff });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-5 text-[16px] font-semibold text-foreground">
        {t("companies.detail.schedulePanel.title")}
      </h2>

      {rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t("companies.detail.schedulePanel.empty")} />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ event, at }) => {
            const stepName = companySteps.find((step) => step.id === event.applicationStepId)?.name;
            const dDay = formatDDay(at);

            return (
              <div
                key={event.id}
                className="flex flex-col gap-1 border-b border-border pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={EVENT_TYPE_BADGE_VARIANT[event.eventType]} size="sm">
                    {t(EVENT_TYPE_LABEL_KEYS[event.eventType])}
                  </Badge>
                  {dDay && (
                    <Badge variant="neutral" size="sm">
                      {dDay}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                <p className="text-xs text-secondary">
                  {stepName ? `${stepName} · ` : ""}
                  {new Date(at).toLocaleString(localeCode, {
                    month: "2-digit",
                    day: "2-digit",
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
