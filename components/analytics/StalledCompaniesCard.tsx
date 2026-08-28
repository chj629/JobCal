"use client";

import Link from "next/link";
import { useMemo } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import EmptyState from "@/components/ui/EmptyState";
import ScrollFade from "@/components/ui/ScrollFade";
import { useScrollFade } from "@/lib/useScrollFade";
import type { Company } from "@/lib/companies";
import type { CompanyNote } from "@/lib/companyNotes";
import { getCurrentStep, getStepDisplayName, type ApplicationStep } from "@/lib/applicationSteps";
import {
  buildCompanyActivityMap,
  stalledDaysForCompany,
} from "@/lib/analyticsActivity";
import { todayKeyInAsiaTokyo } from "@/lib/date";
import type { AppEvent } from "@/lib/events";
import type { NextAction } from "@/lib/nextActions";
import { useT } from "@/lib/locale-context";

interface StalledCompaniesCardProps {
  companies: Company[];
  steps: ApplicationStep[];
  events: AppEvent[];
  notes: CompanyNote[];
  nextActions: NextAction[];
}

const MAX_ROWS = 6;

// "返信・結果待ち" 카드. 기업 기본정보 수정 시각이 아니라 전형/일정/메모/다음 액션의
// 실제 활동 시각을 기준으로 오래된 진행 중 기업을 보여준다.
export default function StalledCompaniesCard({
  companies,
  steps,
  events,
  notes,
  nextActions,
}: StalledCompaniesCardProps) {
  const t = useT();
  const today = todayKeyInAsiaTokyo();
  const activityByCompany = useMemo(
    () => buildCompanyActivityMap({ companies, steps, events, notes, nextActions }),
    [companies, steps, events, notes, nextActions]
  );

  const rows = companies
    .map((company) => {
      const activity = activityByCompany.get(company.id);
      const days = stalledDaysForCompany(
        company,
        activity ?? { lastActivityAt: company.createdAt, hasNearFutureEvent: false },
        today
      );
      return {
        company,
        days,
      };
    })
    .filter((row): row is { company: Company; days: number } => row.days !== null)
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
