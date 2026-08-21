"use client";

import { useAiDrawer } from "@/lib/ai-drawer-context";
import { useT } from "@/lib/locale-context";
import EmptyState from "@/components/ui/EmptyState";
import MaterialIcon from "@/components/ui/MaterialIcon";

export interface DashboardEmptyStateProps {
  onManualRegister: () => void;
}

// companies.length === 0일 때만 Dashboard 상단에 렌더되는 통합 안내 영역. 기존 5개 카드
// (TodayChecklist/TodaySchedule/UpcomingSchedule/PipelineOverview/FocusCompanies)는 각자의
// EmptyState를 그대로 유지하고(CTA 없음) — 행동 유도는 이 컴포넌트 하나만 담당한다.
//
// 디자인은 새 색상/그라데이션 없이 기존 토큰만 재사용한다: EmptyState(icon+title+description)
// 그대로, 카드 표면(rounded-stitch-xl/border-stitch-border/bg-card/shadow-sm)은 다른 Dashboard
// 카드들과 동일, Primary 버튼은 이 페이지 우상단 "企業を登録" 버튼과 같은 flat navy 스타일.
export default function DashboardEmptyState({ onManualRegister }: DashboardEmptyStateProps) {
  const t = useT();
  // app/(app)/layout.tsx의 handleOpenAiDrawer를 그대로 여는 것 — Header의 「AIで追加」
  // 버튼과 완전히 같은 함수를 공유하므로 Drawer open 로직을 여기서 새로 만들지 않는다.
  const { open: openAiDrawer } = useAiDrawer();

  return (
    <div className="mb-3 flex flex-col items-center gap-5 rounded-stitch-xl border border-stitch-border bg-card p-8 text-center shadow-sm">
      <EmptyState
        icon="auto_awesome"
        title={t("dashboard.emptyState.title")}
        description={t("dashboard.emptyState.description")}
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={openAiDrawer}
          className="flex items-center gap-1.5 rounded-stitch-xl bg-primary-navy px-5 py-2.5 text-[13px] font-[500] text-white shadow-sm transition-all hover:opacity-90"
        >
          <MaterialIcon name="auto_awesome" size={16} />
          {t("header.aiCta")}
        </button>
        <button
          type="button"
          onClick={onManualRegister}
          className="rounded-stitch-xl border border-stitch-border px-5 py-2.5 text-[13px] font-[500] text-stitch-ink transition-colors hover:bg-black/[0.02]"
        >
          {t("dashboard.emptyState.manualCta")}
        </button>
      </div>
    </div>
  );
}
