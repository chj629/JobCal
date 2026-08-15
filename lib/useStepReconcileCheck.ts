"use client";

import { useRef, useState } from "react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { FINAL_OVERALL_STATUSES, type Company, type CompanyFormValues } from "@/lib/companies";

interface ReconcileState {
  company: Company;
  values: CompanyFormValues;
}

// Company Detail 헤더의 overallStatus 인라인 select(handleOverallStatusChange)를 감싸서,
// overallStatus가 "새로" 최종 상태(offer/joined/rejected/cancelled)로 바뀌는데 아직 결과가
// 정해지지 않은(waiting/in_progress) application_steps가 남아있으면 저장을 가로채고 확인
// 모달을 띄운다. stepStatus에 passed/failed가 명확히 분리된 지금은 전형을 하나씩 다시 골라야
// 하는 이유가 없어(2단계/5단계에서 실패 시 자동 제안 흐름이 이미 처리) "그대로 진행할지"만
// 물으면 충분하다 — 전형 상태 자체는 여기서 건드리지 않는다. 그 외 모든 경우(같은 상태로
// 재저장, in_progress로 되돌림, 미결 step 없음)는 기존처럼 곧바로 저장한다.
export function useStepReconcileCheck() {
  const { steps } = useApplicationSteps();
  const [state, setState] = useState<ReconcileState | null>(null);
  const onProceedRef = useRef<((values: CompanyFormValues) => void) | null>(null);

  function guardSubmit(company: Company, onProceed: (values: CompanyFormValues) => void) {
    return (values: CompanyFormValues) => {
      const isNewFinalStatus =
        FINAL_OVERALL_STATUSES.includes(values.overallStatus) &&
        values.overallStatus !== company.overallStatus;

      if (!isNewFinalStatus) {
        onProceed(values);
        return;
      }

      const hasUndecidedSteps = steps.some(
        (step) =>
          step.companyId === company.id &&
          (step.stepStatus === "waiting" || step.stepStatus === "in_progress")
      );

      if (!hasUndecidedSteps) {
        onProceed(values);
        return;
      }

      onProceedRef.current = onProceed;
      setState({ company, values });
    };
  }

  function cancel() {
    setState(null);
    onProceedRef.current = null;
  }

  function confirm() {
    if (!state || !onProceedRef.current) return;
    const proceed = onProceedRef.current;
    const { values } = state;
    setState(null);
    onProceedRef.current = null;
    proceed(values);
  }

  return {
    guardSubmit,
    reconcileState: state,
    cancel,
    confirm,
  };
}
