"use client";

import { ClipboardCheck } from "lucide-react";
import type { Company } from "@/lib/companies";
import { useT } from "@/lib/locale-context";
import EmptyState from "@/components/ui/EmptyState";

interface ResultSummaryCardProps {
  companies: Company[];
}

// 11_analytics.png "선고 결과 서머리" 카드. StatusDonutChart(상태별 기업 수 도넛)와
// 중복되지 않도록 원형 차트를 다시 그리지 않고, offer/joined/rejected 3개 결과만
// 간단한 숫자 요약으로 보여준다. 색상은 StatusDonutChart와 동일한 토큰을 재사용해
// 두 카드 사이의 색 의미를 일치시킨다.
export default function ResultSummaryCard({ companies }: ResultSummaryCardProps) {
  const t = useT();

  const offerCount = companies.filter((c) => c.overallStatus === "offer").length;
  const joinedCount = companies.filter((c) => c.overallStatus === "joined").length;
  const rejectedCount = companies.filter((c) => c.overallStatus === "rejected").length;
  const total = offerCount + joinedCount + rejectedCount;

  const items = [
    {
      key: "offer",
      label: t("companies.list.status.offer"),
      count: offerCount,
      dotClass: "bg-success",
    },
    {
      key: "joined",
      label: t("companies.list.status.joined"),
      count: joinedCount,
      dotClass: "bg-joined",
    },
    {
      key: "rejected",
      label: t("companies.list.status.rejected"),
      count: rejectedCount,
      dotClass: "bg-error",
    },
  ];

  return (
    <section className="rounded-[10px] border border-border bg-card p-6">
      <h2 className="text-[16px] font-semibold text-foreground">
        {t("analytics.resultSummary.title")}
      </h2>

      {total === 0 ? (
        <EmptyState icon={ClipboardCheck} title={t("analytics.resultSummary.empty")} />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {items.map(({ key, label, count, dotClass }) => {
            const percent = Math.round((count / total) * 1000) / 10;

            return (
              <div key={key} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + dotClass} />
                  <span className="text-sm text-secondary">{label}</span>
                </div>
                <p className="mt-2 text-[28px] font-bold text-foreground">
                  {count}
                  <span className="ml-1 text-sm font-medium text-secondary">
                    {t("analytics.resultSummary.unit")}
                  </span>
                </p>
                <p className="mt-1 text-xs text-secondary">{percent}%</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
