// docs/database.md: application_steps.step_status
export type StepStatus = "waiting" | "in_progress" | "passed" | "failed";

export const STEP_STATUSES: StepStatus[] = ["waiting", "in_progress", "passed", "failed"];

// StepDetailPanel.tsx의 전형 상태 select와 StepReconcileDialog.tsx가 공유하는 i18n 키.
export const STEP_STATUS_LABEL_KEYS: Record<StepStatus, string> = {
  waiting: "companies.steps.statusLabels.waiting",
  in_progress: "companies.steps.statusLabels.inProgress",
  passed: "companies.steps.statusLabels.passed",
  failed: "companies.steps.statusLabels.failed",
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

// supabase/migrations/0010_add_application_steps_step_key.sql의 8개 키와 1:1로 대응하며,
// messages/ko.json·ja.json의 applicationSteps.default.* 키 이름과도 동일하다.
export const DEFAULT_STEP_KEYS = [
  "entry",
  "briefing",
  "es",
  "web_test",
  "coding_test",
  "interview_1",
  "interview_2",
  "interview_final",
] as const;

export type DefaultStepKey = (typeof DEFAULT_STEP_KEYS)[number];

export interface ApplicationStep {
  id: string;
  companyId: string;
  name: string;
  // 기본 8단계로 생성됐고 이후 이름이 바뀌지 않았으면 DEFAULT_STEP_KEYS 중 하나, 사용자가
  // 직접 추가했거나 기본 단계 이름을 수정한 경우 null.
  stepKey: string | null;
  stepOrder: number;
  stepStatus: StepStatus;
}

// Supabase application_steps 테이블의 컬럼(snake_case)과 1:1로 대응한다.
export interface ApplicationStepRow {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  step_key: string | null;
  step_order: number;
  step_status: StepStatus;
}

export function rowToApplicationStep(row: ApplicationStepRow): ApplicationStep {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    stepKey: row.step_key,
    stepOrder: row.step_order,
    stepStatus: row.step_status,
  };
}

// step_key가 있으면 i18n 기본 이름(언어별 번역)을, 없으면 사용자가 입력한 name을 그대로
// 반환한다. StepTimeline/StepDetailPanel/Calendar 등 전형명을 표시하는 모든 화면이 공유한다.
export function getStepDisplayName(
  step: Pick<ApplicationStep, "name" | "stepKey">,
  t: (key: string) => string
): string {
  if (step.stepKey) {
    return t(`applicationSteps.default.${step.stepKey}`);
  }
  return step.name;
}

// application-steps-context.tsx의 updateStepStatus가 캐스케이드(뒤 단계 waiting 정리 + 다음
// 단계 in_progress 승격)를 보장하므로, 기업당 in_progress는 항상 0개 또는 1개다.
// - in_progress가 있으면 그 전형이 현재 전형이다.
// - in_progress가 없고 failed가 있으면(뒤 단계로 넘어가지 않고 멈춘 상태) 그 failed 전형이
//   현재 전형이다.
// - 둘 다 없으면(전부 passed) 가장 마지막 전형을 현재 전형으로 표시한다. 전형이 없으면 null.
export function getCurrentStep(steps: ApplicationStep[]): ApplicationStep | null {
  if (steps.length === 0) return null;
  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  return (
    sorted.find((step) => step.stepStatus === "in_progress") ??
    sorted.find((step) => step.stepStatus === "failed") ??
    sorted[sorted.length - 1]
  );
}
