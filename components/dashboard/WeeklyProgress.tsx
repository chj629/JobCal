"use client";

import { useTodayChecklist } from "@/components/dashboard/TodayChecklist";
import { dateKeyOf, diffInDays, todayKey } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import type { AppEvent } from "@/lib/events";

interface WeeklyProgressProps {
  events: AppEvent[];
}

// docs/stitch/메인페이지 5개/jobcal_dashboard_added_weekly_progress_summary의 "今週の進捗" 카드.
// Stitch에만 있고 아직 정의되지 않은 지표라, 기존 데이터 중 가장 가까운 실제 의미로
// "이번 주(오늘부터 7일) 마감인 항목 중 체크 완료(event_completions)한 비율"을 계산한다.
// 나중에 실제 "주간 진행률" 정의가 확정되면 이 계산만 교체하면 된다.
export default function WeeklyProgress({ events }: WeeklyProgressProps) {
  const t = useT();
  const { checkedIds } = useTodayChecklist(events);

  const today = todayKey();
  const weekDeadlines = events.filter((event) => {
    if (event.eventType !== "deadline" || event.dueAt === null) return false;
    const diff = diffInDays(today, dateKeyOf(event.dueAt));
    return diff >= 0 && diff <= 6;
  });
  const completedCount = weekDeadlines.filter((event) => checkedIds.has(event.id)).length;
  const totalCount = weekDeadlines.length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="mb-3 flex items-center gap-4 rounded-stitch-xl border border-stitch-border bg-card px-6 py-3 shadow-sm">
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[14px] font-[400] text-stitch-ink">
          {t("dashboard.weeklyProgress.title")}
        </span>
        <span className="text-[14px] font-[500] text-primary-navy">🔥 {percent}%</span>
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full bg-primary-navy" style={{ width: `${percent}%` }} />
      </div>
      <div className="shrink-0">
        <span className="text-[12px] font-[400] text-secondary">
          {t("dashboard.weeklyProgress.completed", { done: completedCount, total: totalCount })}
        </span>
      </div>
    </div>
  );
}
