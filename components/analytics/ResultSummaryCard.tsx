"use client";

import MaterialIcon from "@/components/ui/MaterialIcon";
import type { Company } from "@/lib/companies";
import { getStepDisplayName, type ApplicationStep } from "@/lib/applicationSteps";
import { buildStepFunnelRows } from "@/lib/stepFunnel";
import { useT } from "@/lib/locale-context";
import EmptyState from "@/components/ui/EmptyState";
import ScrollFade from "@/components/ui/ScrollFade";
import { useScrollFade } from "@/lib/useScrollFade";

interface ResultSummaryCardProps {
  companies: Company[];
  steps: ApplicationStep[];
}

// docs/stitch/메인페이지 5개/jobcal_analytics_standardized_design_refresh의 "選考結果"
// 카드. StepFunnelChart.tsx와 같은 전형명별 집계(lib/stepFunnel.ts)를 재사용해, 첫 단계
// (エントリー 격)를 제외한 각 단계의 통과율(=passRate)과 통과/불합격 인원을 보여준다.
// 통과/불합격은 그 단계의 stepStatus가 실제로 passed/failed인 건수를 그대로 센 값이고,
// 통과율은 passedCount / (passedCount + failedCount)다(in_progress/waiting은 분모에서 제외).
export default function ResultSummaryCard({ companies, steps }: ResultSummaryCardProps) {
  const t = useT();
  const rows = buildStepFunnelRows(companies, steps).slice(1);
  const { scrollRef, canScrollDown, onScroll } = useScrollFade([rows.length]);

  return (
    <section className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <h2 className="mb-6 flex items-center gap-2 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="fact_check" size={17} className="text-secondary" />
        {t("analytics.resultSummary.title")}
      </h2>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="fact_check" title={t("analytics.resultSummary.empty")} />
        </div>
      ) : (
        // justify-center였을 때, 행이 늘어나 카드 높이(340px)를 넘기면 overflow-y-auto와
        // justify-center가 함께 콘텐츠를 위아래로 절반씩 넘치게 만들어 맨 위 행의 윗부분이
        // 스크롤로도 닿지 않는 영역에 잘려 있었다(음수 스크롤은 불가능). justify-start(기본값)로
        // 바꿔 항상 첫 행 맨 위부터 보이게 한다.
        <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex h-full flex-col gap-6 overflow-y-auto stitch-scrollbar-hidden"
        >
          {rows.map((row) => {
            const displayName = getStepDisplayName({ name: row.name, stepKey: row.stepKey }, t);

            return (
              <div key={row.name} className="mx-auto w-full max-w-[420px] space-y-1.5">
                {/* 전형명이 길면 truncate 대신 자연스럽게 줄바꿈한다. min-w-0(줄어들 수 있게)
                    + shrink-0(퍼센트는 고정 폭)으로 이름이 아무리 길어도 이 행이 카드 폭을
                    밀어내지 않는다. items-start라 이름이 2줄이 돼도 퍼센트는 첫 줄 높이에
                    고정되고, 아래 progress bar는 이 flex와 무관한 별도 블록이라 항상 같은
                    좌우 위치에서 시작한다. */}
                <div className="mb-1 flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1 text-[13px] font-[400] leading-snug text-stitch-ink">
                    {displayName}
                  </span>
                  <span className="shrink-0 pt-0.5 text-[11px] text-secondary">
                    {row.passRate}%
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-stitch-bg">
                  <div
                    className="h-full rounded-full bg-primary-navy"
                    style={{ width: `${row.passRate}%` }}
                  />
                </div>
                <div className="mt-1 flex gap-3 text-[12px] text-secondary">
                  <span>
                    {t("analytics.resultSummary.passed")}:{" "}
                    <span className="font-[400] text-stitch-ink">{row.passedCount}</span>
                  </span>
                  <span>
                    {t("analytics.resultSummary.failed")}:{" "}
                    <span className="font-[400] text-stitch-ink">{row.failedCount}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollFade visible={canScrollDown} />
        </div>
      )}
    </section>
  );
}
