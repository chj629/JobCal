import type { StepUpdate } from "./emailAnalysis";
import type { EventFormValues } from "../events";

const RESULT_OPTIONS = new Set<StepUpdate["resultOption"]>([
  "inProgress",
  "passed",
  "failed",
  "withdrawn",
]);

export type EmailAnalysisRegistrationPreflightError =
  | "companyNameRequired"
  | "stepNameRequired"
  | "invalidStepUpdate"
  | "eventStepRequired"
  | "invalidEventDate";

export function getEmailAnalysisRegistrationPreflightError(input: {
  requiresCompanyName: boolean;
  companyName: string;
  stepUpdates: StepUpdate[];
  events: EventFormValues[];
  eventStepNames: (string | null)[];
}): EmailAnalysisRegistrationPreflightError | null {
  if (input.requiresCompanyName && !input.companyName.trim()) return "companyNameRequired";

  for (const update of input.stepUpdates) {
    if (!update.stepName.trim()) return "stepNameRequired";
    if (!RESULT_OPTIONS.has(update.resultOption)) return "invalidStepUpdate";
  }

  for (let index = 0; index < input.events.length; index++) {
    const event = input.events[index];
    // 제목이 없는 빈 일정 카드는 기존 저장 로직과 동일하게 저장 대상에서 제외한다.
    if (!event.title.trim()) continue;
    if (!input.eventStepNames[index]?.trim()) return "eventStepRequired";

    // eventFormValuesToRow/getEventSaveDecision이 Date를 ISO로 바꾸기 전에 검사해,
    // 잘못된 값이 toISOString()에서 예외를 내는 경우도 첫 mutation 전에 차단한다.
    if (
      [event.startsAt, event.endsAt, event.dueAt].some(
        (value) => value && Number.isNaN(new Date(value).getTime())
      )
    ) {
      return "invalidEventDate";
    }
  }

  return null;
}
