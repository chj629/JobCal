import type { ApplicationStep } from "@/lib/applicationSteps";
import type { Company } from "@/lib/companies";
import type { CompanyNote } from "@/lib/companyNotes";
import {
  diffInDaysInAsiaTokyo,
  formatDateKeyInAsiaTokyo,
  todayKeyInAsiaTokyo,
} from "@/lib/date";
import type { AppEvent } from "@/lib/events";
import type { NextAction } from "@/lib/nextActions";

export const STALLED_COMPANY_THRESHOLD_DAYS = 14;

export interface CompanyActivitySummary {
  lastActivityAt: string;
  hasNearFutureEvent: boolean;
}

export function stalledDaysForCompany(
  company: Company,
  activity: CompanyActivitySummary,
  today = todayKeyInAsiaTokyo(),
  thresholdDays = STALLED_COMPANY_THRESHOLD_DAYS
): number | null {
  if (company.overallStatus !== "in_progress" || activity.hasNearFutureEvent) return null;
  const days = diffInDaysInAsiaTokyo(
    formatDateKeyInAsiaTokyo(activity.lastActivityAt),
    today
  );
  return days >= thresholdDays ? days : null;
}

interface BuildCompanyActivityMapInput {
  companies: Company[];
  steps: ApplicationStep[];
  events: AppEvent[];
  notes: CompanyNote[];
  nextActions: NextAction[];
  now?: Date;
  upcomingWindowDays?: number;
}

function validInstant(value: string | undefined): number | null {
  if (!value) return null;
  const milliseconds = Date.parse(value);
  return Number.isNaN(milliseconds) ? null : milliseconds;
}

function recordActivity(
  activityByCompany: Map<string, CompanyActivitySummary>,
  companyId: string,
  value: string | undefined
) {
  const summary = activityByCompany.get(companyId);
  const candidate = validInstant(value);
  if (!summary || candidate === null) return;

  const current = validInstant(summary.lastActivityAt);
  if (current === null || candidate > current) {
    summary.lastActivityAt = value!;
  }
}

// Analytics가 이미 전역 Provider에서 읽어 둔 배열들을 한 번씩만 순회해 회사별 실제 활동을
// 집계한다. companies.updatedAt은 의도적으로 사용하지 않으며, 아무 자식 활동이 없는 신규
// 기업만 createdAt을 fallback으로 삼는다.
export function buildCompanyActivityMap({
  companies,
  steps,
  events,
  notes,
  nextActions,
  now = new Date(),
  upcomingWindowDays = STALLED_COMPANY_THRESHOLD_DAYS,
}: BuildCompanyActivityMapInput): Map<string, CompanyActivitySummary> {
  const activityByCompany = new Map<string, CompanyActivitySummary>();
  const today = todayKeyInAsiaTokyo(now);

  for (const company of companies) {
    activityByCompany.set(company.id, {
      lastActivityAt: company.createdAt,
      hasNearFutureEvent: false,
    });
  }

  for (const step of steps) {
    recordActivity(activityByCompany, step.companyId, step.createdAt);
    recordActivity(activityByCompany, step.companyId, step.updatedAt);
  }

  for (const event of events) {
    recordActivity(activityByCompany, event.companyId, event.createdAt);
    recordActivity(activityByCompany, event.companyId, event.updatedAt);

    for (const scheduledAt of [event.startsAt, event.dueAt]) {
      if (!scheduledAt || validInstant(scheduledAt) === null) continue;
      const scheduledDate = formatDateKeyInAsiaTokyo(scheduledAt);
      const daysFromToday = diffInDaysInAsiaTokyo(today, scheduledDate);

      if (daysFromToday <= 0) {
        // 과거 또는 오늘 실제로 예정된 일정은 DB 수정 시각과 별개인 취활 활동이다.
        recordActivity(activityByCompany, event.companyId, scheduledAt);
      } else if (daysFromToday <= upcomingWindowDays) {
        // 먼 미래 일정 하나 때문에 영구적으로 정체 판정에서 빠지지 않도록, 정체 기준과
        // 같은 기간 안의 가까운 일정만 별도 보호한다.
        const summary = activityByCompany.get(event.companyId);
        if (summary) summary.hasNearFutureEvent = true;
      }
    }
  }

  for (const note of notes) {
    recordActivity(activityByCompany, note.companyId, note.createdAt);
    recordActivity(activityByCompany, note.companyId, note.updatedAt);
  }

  for (const action of nextActions) {
    recordActivity(activityByCompany, action.companyId, action.createdAt);
    // 생성/수정뿐 아니라 done 토글도 next_actions.updated_at trigger를 갱신한다.
    recordActivity(activityByCompany, action.companyId, action.updatedAt);
  }

  return activityByCompany;
}
