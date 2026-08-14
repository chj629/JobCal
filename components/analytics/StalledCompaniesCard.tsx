"use client";

import Link from "next/link";
import MaterialIcon from "@/components/ui/MaterialIcon";
import EmptyState from "@/components/ui/EmptyState";
import ScrollFade from "@/components/ui/ScrollFade";
import { useScrollFade } from "@/lib/useScrollFade";
import type { Company } from "@/lib/companies";
import { getCurrentStep, getStepDisplayName, type ApplicationStep } from "@/lib/applicationSteps";
import { todayKey, diffInDays } from "@/lib/date";
import { useT } from "@/lib/locale-context";

interface StalledCompaniesCardProps {
  companies: Company[];
  steps: ApplicationStep[];
}

// 이 기간 이상 companies.updated_at이 갱신되지 않은 진행 중 기업을 "정체됨"으로 본다.
// updated_at은 어떤 필드든 수정되면 갱신되므로, 그만큼 오래 아무 변화가 없었다는 것은
// 실제로 정체됐다고 볼 수 있는 근거가 된다(companies/page.tsx의 formatUpdatedRelative와
// 동일한 필드를 재사용).
const STALLED_THRESHOLD_DAYS = 14;
const MAX_ROWS = 6;

// "返信・結果待ち" 카드. overallStatus가 in_progress인데 오래 갱신이 없는 기업을
// 오래된 순으로 보여준다. companies/page.tsx의 formatUpdatedRelative와 같은 로직을
// 이 화면 전용으로 로컬 재구현한다(공용 모듈로 옮기면 딱 1곳 더 쓰자고 새 추상화를
// 만드는 셈이라, 기존 폼 컴포넌트들의 로컬 헬퍼 중복 관례를 그대로 따른다).
export default function StalledCompaniesCard({ companies, steps }: StalledCompaniesCardProps) {
  const t = useT();
  const today = todayKey();

  const rows = companies
    .filter((c) => c.overallStatus === "in_progress")
    .map((company) => ({ company, days: diffInDays(company.updatedAt, today) }))
    .filter((row) => row.days >= STALLED_THRESHOLD_DAYS)
    .sort((a, b) => b.days - a.days)
    .slice(0, MAX_ROWS);
  const { scrollRef, canScrollDown, onScroll } = useScrollFade([rows.length]);

  return (
    <section className="flex h-[340px] flex-col rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="hourglass_empty" size={17} className="text-secondary" />
        {t("analytics.stalled.title")}
      </h2>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon="check_circle" title={t("analytics.stalled.empty")} />
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full space-y-1 overflow-y-auto overflow-x-hidden stitch-scrollbar-hidden pr-1"
        >
          {rows.map(({ company, days }) => {
            const companySteps = steps.filter((s) => s.companyId === company.id);
            const currentStep = getCurrentStep(companySteps);
            const stepName = currentStep ? getStepDisplayName(currentStep, t) : t("dashboard.noStepLabel");

            return (
              <Link
                key={company.id}
                href={`/companies/${company.id}`}
                className="-mx-2 flex items-center justify-between gap-3 rounded-stitch-xl px-2 py-1.5 transition-colors hover:bg-black/[0.015]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-stitch-ink">{company.name}</p>
                  <p className="truncate text-[12px] text-secondary">{stepName}</p>
                </div>
                <span className="shrink-0 rounded-stitch-md border border-error/20 bg-error/10 px-2 py-0.5 text-[11px] text-error">
                  {t("analytics.stalled.daysSince", { days })}
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
