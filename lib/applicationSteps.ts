// docs/database.md: application_steps.step_status
export type StepStatus = "waiting" | "action_required" | "scheduled" | "completed";

export const STEP_STATUSES: StepStatus[] = [
  "waiting",
  "action_required",
  "scheduled",
  "completed",
];

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  waiting: "대기",
  action_required: "해야 함",
  scheduled: "일정 확정",
  completed: "완료",
};

// 기업 생성 시 자동 생성되는 기본 전형 (docs/database.md 기준)
export const DEFAULT_STEP_NAMES = [
  "엔트리",
  "설명회",
  "ES",
  "Web 테스트",
  "코딩 테스트",
  "1차 면접",
  "2차 면접",
  "최종 면접",
];

export interface ApplicationStep {
  id: string;
  companyId: string;
  name: string;
  stepOrder: number;
  stepStatus: StepStatus;
}

// Supabase application_steps 테이블의 컬럼(snake_case)과 1:1로 대응한다.
export interface ApplicationStepRow {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  step_order: number;
  step_status: StepStatus;
}

export function rowToApplicationStep(row: ApplicationStepRow): ApplicationStep {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    stepOrder: row.step_order,
    stepStatus: row.step_status,
  };
}

// docs/database.md: step_order가 가장 앞서면서 step_status가 completed가 아닌 전형을 현재 전형으로 계산.
// 모든 전형이 완료된 경우 가장 마지막 전형을 현재 전형으로 표시. 전형이 없으면 null.
export function getCurrentStep(steps: ApplicationStep[]): ApplicationStep | null {
  if (steps.length === 0) return null;
  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  return sorted.find((step) => step.stepStatus !== "completed") ?? sorted[sorted.length - 1];
}
