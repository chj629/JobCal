"use client";

import Link from "next/link";
import MaterialIcon from "@/components/ui/MaterialIcon";
import EmptyState from "@/components/ui/EmptyState";
import ScrollFade from "@/components/ui/ScrollFade";
import { useScrollFade } from "@/lib/useScrollFade";
import { EVENT_CHIP_CLASS } from "@/components/calendar/eventChipStyle";
import type { Company } from "@/lib/companies";
import type { AppEvent, EventType } from "@/lib/events";
import {
  diffInDaysInAsiaTokyo,
  formatDateKeyInAsiaTokyo,
  todayKeyInAsiaTokyo,
} from "@/lib/date";
import { useT } from "@/lib/locale-context";

interface DeadlineRiskCardProps {
  companies: Company[];
  events: AppEvent[];
}

const RISK_WINDOW_DAYS = 7;
const MAX_ROWS = 6;
// 이미 결과가 정해져 더 이상 대응할 필요가 없는 상태. rejected/cancelled는 명백히 무효한
// 일정이고, joined는 그 기업에 대한 선고 활동 자체가 끝난 상태라 남아있는 일정은 대부분
// 정리되지 않은 과거 데이터다. offer는 예외로 둔다(예: 오퍼 회신 기한처럼 아직 실제로
// 대응해야 할 일정이 있을 수 있다).
const EXCLUDED_STATUSES = new Set(["rejected", "cancelled", "joined"]);

const EVENT_TYPE_LABEL_KEYS: Record<EventType, string> = {
  schedule: "companies.events.types.schedule",
  deadline: "companies.events.types.deadline",
  result_announcement: "companies.events.types.resultAnnouncement",
};

// "締切リスク" 카드. events.startsAt/dueAt 중 하나(getNextEvent 등 기존 코드와 동일하게
// startsAt을 우선)가 오늘부터 7일 이내인 항목만 모은다. 과거 일정은 제외한다.
export default function DeadlineRiskCard({ companies, events }: DeadlineRiskCardProps) {
  const t = useT();
  const today = todayKeyInAsiaTokyo();

  const excludedCompanyIds = new Set(
    companies.filter((c) => EXCLUDED_STATUSES.has(c.overallStatus)).map((c) => c.id)
  );

  const rows = events
    .filter((event) => !excludedCompanyIds.has(event.companyId))
    .map((event) => ({ event, at: event.startsAt ?? event.dueAt }))
    .filter((row): row is { event: AppEvent; at: string } => row.at !== null)
    .map((row) => ({
      ...row,
      diff: diffInDaysInAsiaTokyo(today, formatDateKeyInAsiaTokyo(row.at)),
    }))
    .filter((row) => row.diff >= 0 && row.diff <= RISK_WINDOW_DAYS)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, MAX_ROWS);
  const { scrollRef, canScrollDown, onScroll } = useScrollFade([rows.length]);

  function dDayLabel(diff: number) {
    if (diff === 0) return t("dashboard.today");
    if (diff === 1) return t("dashboard.tomorrow");
    return t("companies.detail.schedulePanel.dDay", { days: diff });
  }

  return (
    <section className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="priority_high" size={17} className="text-secondary" />
        {t("analytics.deadlineRisk.title")}
      </h2>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="task_alt" title={t("analytics.deadlineRisk.empty")} />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full space-y-1 overflow-y-auto overflow-x-hidden stitch-scrollbar-hidden pr-1"
        >
          {rows.map(({ event, diff }) => {
            const company = companies.find((c) => c.id === event.companyId);

            return (
              <Link
                key={event.id}
                href={`/companies/${event.companyId}`}
                className="-mx-2 flex items-center gap-3 rounded-stitch-xl px-2 py-1.5 transition-colors hover:bg-black/[0.015]"
              >
                <span className="w-12 shrink-0 text-right text-[11px] font-[500] text-primary-navy">
                  {dDayLabel(diff)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-stitch-ink">{event.title}</p>
                  <p className="truncate text-[12px] text-secondary">{company?.name ?? ""}</p>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px] " +
                    EVENT_CHIP_CLASS[event.eventType]
                  }
                >
                  {t(EVENT_TYPE_LABEL_KEYS[event.eventType])}
                </span>
              </Link>
            );
          })}
        </div>
        <ScrollFade visible={canScrollDown} />
        </div>
      )}
    </section>
  );
}
