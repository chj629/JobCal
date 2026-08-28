import type { Company } from "@/lib/companies";
import type { AppEvent } from "@/lib/events";

// Dashboard는 Calendar와 달리 과거 기록 열람이 아니라 "지금 해야 할 행동"을 보여준다.
// 전형 활동이 끝난 기업의 일정은 DB/Context에는 그대로 보존하되, Dashboard에 전달하는
// 이벤트 배열에서만 한 번 걸러 모든 KPI·체크리스트·일정 위젯이 같은 기준을 쓰게 한다.
const DASHBOARD_ACTION_EXCLUDED_STATUSES = new Set<Company["overallStatus"]>([
  "rejected",
  "cancelled",
  "joined",
]);

export function filterDashboardActionEvents(
  companies: Pick<Company, "id" | "overallStatus">[],
  events: AppEvent[]
): AppEvent[] {
  const excludedCompanyIds = new Set(
    companies
      .filter((company) => DASHBOARD_ACTION_EXCLUDED_STATUSES.has(company.overallStatus))
      .map((company) => company.id)
  );

  return events.filter((event) => !excludedCompanyIds.has(event.companyId));
}
