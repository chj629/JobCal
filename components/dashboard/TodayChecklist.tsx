"use client";

import { todayKey, dateKeyOf } from "@/lib/date";
import { useEventCompletions } from "@/lib/event-completions";
import type { AppEvent } from "@/lib/events";
import type { Company } from "@/lib/companies";
import { useT } from "@/lib/locale-context";
import EmptyState from "@/components/ui/EmptyState";
import MaterialIcon from "@/components/ui/MaterialIcon";

// 오늘 마감 체크리스트의 데이터/토글 로직. 통합 뷰(TodaySchedule)가 재사용할 수 있도록
// 훅으로 분리했다. 체크 상태 자체는 lib/event-completions.ts의 공용 훅을 그대로 쓰고,
// 여기서는 "오늘 마감인 이벤트만" 필터링만 담당한다.
export function useTodayChecklist(events: AppEvent[]) {
  const today = todayKey();

  const todayDeadlines = events
    .filter((event) => event.eventType === "deadline" && event.dueAt !== null)
    .filter((event) => dateKeyOf(event.dueAt as string) === today)
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime());

  const { checkedIds, loaded, toggle, error: taskError } = useEventCompletions();

  return { todayDeadlines, checkedIds, loaded, toggle, taskError };
}

interface TodayChecklistCardProps {
  companies: Company[];
  events: AppEvent[];
}

// docs/stitch/메인페이지 5개/jobcal_dashboard_added_weekly_progress_summary의 "今日やること" 카드.
// 데이터/토글 로직은 useTodayChecklist를 그대로 재사용하고, 카드 UI만 새로 그린다.
export default function TodayChecklistCard({ companies, events }: TodayChecklistCardProps) {
  const t = useT();
  const { todayDeadlines, checkedIds, loaded, toggle, taskError } = useTodayChecklist(events);

  return (
    <div className="flex h-[275px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <div className="mb-3 shrink-0">
        <h3 className="flex items-center gap-1.5 text-[13px] font-[400] text-stitch-ink">
          <MaterialIcon name="check_box" size={15} className="text-secondary" />
          {t("dashboard.todayChecklist.title")}
        </h3>
        <span className="mt-0.5 block text-[11px] text-secondary">
          {t("dashboard.todayChecklist.taskCount", { count: todayDeadlines.length })}
        </span>
      </div>

      {taskError && <p className="mb-2 shrink-0 text-[11px] text-error">{taskError}</p>}

      {todayDeadlines.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="check_box" title={t("dashboard.todayChecklist.empty")} />
        </div>
      ) : (
        <div className="min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden stitch-scrollbar-hidden pr-1">
          {todayDeadlines.map((event) => {
            const company = companies.find((c) => c.id === event.companyId);
            const checked = checkedIds.has(event.id);

            return (
              <label
                key={event.id}
                className={
                  "-mx-1.5 flex items-start gap-3 rounded-stitch-xl border border-transparent px-1.5 py-1.5 transition-colors hover:border-stitch-border hover:bg-black/[0.015] " +
                  (checked ? "opacity-60" : "")
                }
              >
                <div className="relative mt-0.5 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!loaded}
                    onChange={() => toggle(event.id)}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border-stitch-border bg-background text-primary-navy focus:ring-0 focus:ring-offset-0 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p
                    className={
                      "truncate text-[12px] font-[400] leading-tight " +
                      (checked ? "text-secondary line-through" : "text-stitch-ink")
                    }
                  >
                    {event.title}
                  </p>
                  <span className="truncate text-[11px] text-secondary">{company?.name ?? ""}</span>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
