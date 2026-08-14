"use client";

import { useRef, useState } from "react";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { FINAL_OVERALL_STATUSES, type Company, type CompanyFormValues } from "@/lib/companies";
import type { ApplicationStep, StepStatus } from "@/lib/applicationSteps";
import { useT } from "@/lib/locale-context";

interface ReconcileState {
  company: Company;
  values: CompanyFormValues;
  incompleteSteps: ApplicationStep[];
}

// CompanyForm의 onSubmit을 감싸서, overallStatus가 "새로" 최종 상태(offer/joined/rejected/
// cancelled)로 바뀌는데 미완료 application_steps가 남아있으면 저장을 가로채고 확인 모달을
// 띄운다. 그 외 모든 경우(같은 상태로 재저장, in_progress로 되돌림, 미완료 step 없음)는
// 기존처럼 곧바로 저장한다. Companies 목록 편집 / Company Detail 편집 양쪽에서 동일하게
// 재사용한다.
export function useStepReconcileCheck() {
  const t = useT();
  const { steps, updateStepStatus } = useApplicationSteps();
  const [state, setState] = useState<ReconcileState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
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

      const incompleteSteps = steps.filter(
        (step) => step.companyId === company.id && step.stepStatus !== "completed"
      );

      if (incompleteSteps.length === 0) {
        onProceed(values);
        return;
      }

      onProceedRef.current = onProceed;
      setStepError(null);
      setState({ company, values, incompleteSteps });
    };
  }

  function cancel() {
    setState(null);
    setStepError(null);
    onProceedRef.current = null;
  }

  function saveWithoutStepChanges() {
    if (!state || !onProceedRef.current) return;
    const proceed = onProceedRef.current;
    const { values } = state;
    setState(null);
    onProceedRef.current = null;
    proceed(values);
  }

  async function saveWithStepChanges(changes: Record<string, StepStatus>) {
    if (!state || !onProceedRef.current) return;

    setIsSaving(true);
    setStepError(null);
    const results = await Promise.all(
      Object.entries(changes).map(([stepId, status]) => updateStepStatus(stepId, status))
    );
    setIsSaving(false);

    // 일부라도 실패하면 overallStatus는 저장하지 않고, 모달을 열어둔 채 에러만 보여준다.
    if (results.some((ok) => !ok)) {
      setStepError(t("companies.stepReconcile.stepUpdateError"));
      return;
    }

    const proceed = onProceedRef.current;
    const { values } = state;
    setState(null);
    onProceedRef.current = null;
    proceed(values);
  }

  return {
    guardSubmit,
    reconcileState: state,
    isSaving,
    stepError,
    cancel,
    saveWithoutStepChanges,
    saveWithStepChanges,
  };
}
