"use client";

import { useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { formatTimeOfDay } from "@/lib/date";
import { useEventCompletions } from "@/lib/event-completions";
import { useT } from "@/lib/locale-context";
import type { AppEvent } from "@/lib/events";
import type { Company } from "@/lib/companies";

interface TodayEventsCardProps {
  events: AppEvent[]; // 이미 "오늘" + 시간순으로 걸러진 목록을 그대로 받는다.
  companies: Company[];
  onSelectEvent: (event: AppEvent) => void;
}

const ALWAYS_VISIBLE_COUNT = 2;

// docs/stitch/메인페이지 5개/jobcal_calendar_*의 좌측 "今日の予定" 카드. 체크박스는
// lib/event-completions.ts의 공용 event_completions 테이블을 그대로 재사용해 실제로
// 저장/토글되도록 구현했다(TodayChecklist.tsx가 마감 이벤트만 다루는 것과 달리, 여기는
// 오늘의 이벤트 전체를 대상으로 한다). "もっと見る/閉じる" 펼치기는 code.html의
// grid-template-rows 트랜지션을 그대로 옮겼다.
export default function TodayEventsCard({ events, companies, onSelectEvent }: TodayEventsCardProps) {
  const t = useT();
  const { checkedIds, loaded, toggle } = useEventCompletions();
  const [isExpanded, setIsExpanded] = useState(false);

  const visible = events.slice(0, ALWAYS_VISIBLE_COUNT);
  const extra = events.slice(ALWAYS_VISIBLE_COUNT);

  function renderItem(event: AppEvent) {
    const company = companies.find((c) => c.id === event.companyId);
    const checked = checkedIds.has(event.id);
    const at = event.startsAt ?? event.dueAt;
    const timeLabel = at
      ? formatTimeOfDay(at) + (event.endsAt ? ` - ${formatTimeOfDay(event.endsAt)}` : "")
      : "";

    return (
      <label
        key={event.id}
        className={
          "-mx-1 flex items-start gap-3 rounded-stitch-md px-1 py-0.5 transition-colors hover:bg-black/[0.02] " +
          (checked ? "opacity-60" : "")
        }
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={!loaded}
          onChange={() => toggle(event.id)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border-stitch-border bg-background text-primary-navy focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={() => onSelectEvent(event)}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={
              "truncate text-[13px] font-[400] " + (checked ? "text-secondary line-through" : "text-stitch-ink")
            }
          >
            {event.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-secondary">
            {company?.name ?? ""}
            {company && timeLabel ? " · " : ""}
            {timeLabel}
          </p>
        </button>
      </label>
    );
  }

  return (
    <div className="flex flex-col rounded-stitch-2xl border border-stitch-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h4 className="text-[14px] font-[400] text-stitch-ink">{t("calendar.todayEvents.title")}</h4>
        {extra.length > 0 && !isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-[11px] text-secondary transition-colors hover:text-stitch-ink"
          >
            {t("dashboard.todaySchedule.viewAll")}
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState icon="today" title={t("dashboard.todaySchedule.empty")} />
      ) : (
        <>
          <div className="space-y-3">{visible.map(renderItem)}</div>
          {extra.length > 0 && (
            <>
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="space-y-3 pt-3">{extra.map(renderItem)}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                className="mt-4 flex w-full shrink-0 items-center justify-center rounded-stitch-lg border border-stitch-border bg-stitch-bg py-2 text-[12px] font-[400] text-secondary transition-colors hover:text-stitch-ink"
              >
                {isExpanded ? t("calendar.todayEvents.showLess") : t("calendar.todayEvents.showMore")}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
