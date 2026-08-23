import { translate } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";

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

// matchDefaultStepKey 비교용: 공백을 전부 지우고 라틴 문자만 대문자로 통일해, 표기 변형
// (예: "WEBテスト" vs "Web テスト" vs "Webテスト")을 같은 문자열로 취급한다. 한글/가나는
// 대소문자 개념이 없어 영향받지 않는다.
function normalizeStepText(text: string): string {
  return text.replace(/\s+/g, "").toUpperCase();
}

const LOCALES_TO_CHECK: Locale[] = ["ko", "ja"];

// AI 메일 분석이 반환한 stepName처럼 어떤 언어로 올지 알 수 없는 문자열이, 8개 기본 전형
// (DEFAULT_STEP_KEYS) 중 어느 것과 의미상 같은지 판정한다. messages/ko.json·ja.json에 이미
// 있는 canonical 번역 문자열만 비교 대상으로 쓰고(현재 UI locale과 무관하게 ko/ja 둘 다
// 확인), "Webテスト"만 하드코딩하는 식의 임시방편 대신 8개 키 전부를 같은 방식으로 다룬다.
// 사용자가 직접 만든 커스텀 전형(step_key가 없는 전형)은 이 함수의 대상이 아니다 — 이 함수는
// 항상 null을 돌려주고, 호출하는 쪽(컴포넌트)이 기존 이름 그대로 별도 전형을 만들거나 매칭한다.
export function matchDefaultStepKey(candidateText: string): DefaultStepKey | null {
  const normalized = normalizeStepText(candidateText);
  if (!normalized) return null;

  for (const key of DEFAULT_STEP_KEYS) {
    const isMatch = LOCALES_TO_CHECK.some(
      (locale) =>
        normalizeStepText(translate(locale, `applicationSteps.default.${key}`)) === normalized
    );
    if (isMatch) return key;
  }
  return null;
}

// application-steps-context.tsx의 updateStepStatus가 in_progress로 바뀔 때마다 기존
// 다른 in_progress를 waiting으로 정리하므로, 기업당 in_progress는 항상 0개 또는 1개다.
// step_order는 사용자가 자유롭게 재정렬할 수 있어 "currentStep보다 뒤는 전부 waiting"이라는
// 보장은 없다(재정렬로 이미 확정된 passed/failed 전형이 currentStep보다 뒤에 남을 수 있다) —
// 아래는 어디까지나 order로 정렬한 뒤 상태만으로 "현재 전형"을 고르는 규칙이다.
// - in_progress가 있으면 그 전형이 현재 전형이다.
// - in_progress가 없고 failed가 있으면(뒤 단계로 넘어가지 않고 멈춘 상태) 그 failed 전형이
//   현재 전형이다.
// - 나머지 전형이 전부 passed면(정상 종료) 가장 마지막 전형을 현재 전형으로 표시한다.
// - in_progress도 failed도 없는데 아직 passed가 아닌(=waiting인) 전형이 하나라도 남아있으면
//   null을 반환한다 — 예전엔 이 경우도 "가장 마지막 전형"을 현재 전형으로 잘못 반환해서,
//   한 번도 승격된 적 없는 waiting 전형(전형 추가로 새로 생겼거나, in_progress였던 전형이
//   삭제된 뒤 아직 아무것도 승격되지 않은 경우)이 StepTimeline에 "진행 중"인 것처럼(파란
//   원으로) 표시되는 버그가 있었다. null은 "지금 진행 중이라고 부를 만한 전형이 없다"는
//   뜻이므로, 호출부는 이 경우 무언가를 진행 중처럼 표시해서는 안 된다.
// 전형이 없으면(steps.length === 0) 당연히 null.
// stepOrder/stepStatus만 있으면 계산할 수 있어 제네릭으로 뒀다 — application-steps-context의
// updateStepStatus가 "미래 waiting" 판정에 Supabase에서 막 조회한 snake_case 행을 그대로
// (필드명만 매핑해) 넘겨 StepDetailPanel의 isFutureWaitingStep과 완전히 같은 함수를 쓴다.
export function getCurrentStep<T extends Pick<ApplicationStep, "stepOrder" | "stepStatus">>(
  steps: T[]
): T | null {
  if (steps.length === 0) return null;
  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  const inProgress = sorted.find((step) => step.stepStatus === "in_progress");
  if (inProgress) return inProgress;

  const failed = sorted.find((step) => step.stepStatus === "failed");
  if (failed) return failed;

  const allPassed = sorted.every((step) => step.stepStatus === "passed");
  return allPassed ? sorted[sorted.length - 1] : null;
}
