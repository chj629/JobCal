"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { handleSupabaseError } from "@/lib/supabase/errorHandling";
import { useT } from "@/lib/locale-context";
import {
  rowToApplicationStep,
  type ApplicationStep,
  type ApplicationStepRow,
  type StepStatus,
} from "@/lib/applicationSteps";

interface ApplicationStepsContextValue {
  steps: ApplicationStep[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<ApplicationStep[]>;
  addStep: (companyId: string, name: string) => Promise<ApplicationStep | null>;
  deleteStep: (id: string) => Promise<boolean>;
  renameStep: (id: string, name: string) => Promise<boolean>;
  updateStepStatus: (id: string, status: StepStatus) => Promise<boolean>;
  moveStep: (id: string, direction: "up" | "down") => Promise<boolean>;
}

const ApplicationStepsContext = createContext<ApplicationStepsContextValue | null>(null);

export function ApplicationStepsProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const supabase = useMemo(() => createClient(), []);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setSteps([]);
      setLoading(false);
      return [];
    }

    setUserId(user.id);

    const { data, error: fetchError } = await supabase
      .from("application_steps")
      .select("*")
      .order("step_order", { ascending: true });

    if (fetchError) {
      await handleSupabaseError(fetchError.message, setError);
      setLoading(false);
      return [];
    }

    const mapped = ((data ?? []) as ApplicationStepRow[]).map(rowToApplicationStep);
    setSteps(mapped);
    setLoading(false);
    return mapped;
  }

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      await load();
    }

    initialLoad();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) load();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // steps(로컬 state)로 nextOrder를 계산하면 updateStepStatus/moveStep과 같은 이유로 이
  // 함수 호출 시점에 최신 상태를 놓칠 수 있다 — 예를 들어 AI Drawer가 방금 만든 회사의
  // 기본 8개 전형이 아직 이 클로저의 steps에 반영되지 않은 채로 커스텀 전형을 추가하면
  // step_order가 1(엔트리와 충돌)로 잘못 계산돼, 실제로 기업당 in_progress가 2개
  // 동시에 존재하는 데이터가 만들어진 적이 있다. 항상 Supabase에서 이 기업의 전형을 직접
  // 다시 조회해 계산한다.
  async function addStep(companyId: string, name: string) {
    if (!userId) return null;

    const { data: companyStepRows, error: fetchError } = await supabase
      .from("application_steps")
      .select("step_order")
      .eq("company_id", companyId);

    if (fetchError) {
      await handleSupabaseError(fetchError.message, setError);
      return null;
    }

    const companySteps = companyStepRows ?? [];
    const nextOrder =
      companySteps.length === 0 ? 1 : Math.max(...companySteps.map((s) => s.step_order)) + 1;
    // 기업당 in_progress는 항상 최대 1개: 전형이 아예 없던 기업(첫 전형)만 곧바로
    // in_progress로 시작하고, 이미 다른 전형이 있는 기업은 이미 in_progress인 전형이
    // 있든 없든 새 전형을 waiting으로 대기시킨다(기존 in_progress를 밀어내지 않는다).
    const initialStatus: StepStatus = companySteps.length === 0 ? "in_progress" : "waiting";

    const { data, error: insertError } = await supabase
      .from("application_steps")
      .insert({
        user_id: userId,
        company_id: companyId,
        name: name.trim(),
        step_order: nextOrder,
        step_status: initialStatus,
      })
      .select()
      .single();

    if (insertError) {
      await handleSupabaseError(insertError.message, setError);
      return null;
    }

    setError(null);
    const created = rowToApplicationStep(data as ApplicationStepRow);
    setSteps((prev) => [...prev, created]);
    return created;
  }

  async function deleteStep(id: string) {
    if (!userId) return false;

    const { error: deleteError } = await supabase.from("application_steps").delete().eq("id", id);

    if (deleteError) {
      await handleSupabaseError(deleteError.message, setError);
      return false;
    }

    setError(null);
    setSteps((prev) => prev.filter((step) => step.id !== id));
    return true;
  }

  async function renameStep(id: string, name: string) {
    if (!userId) return false;

    // 이름을 직접 바꾸는 순간부터는 사용자가 입력한 문자열이므로, 기본 단계였더라도
    // step_key를 null로 내려 이후에는 자동 번역 없이 이 name을 그대로 표시한다.
    const { data, error: updateError } = await supabase
      .from("application_steps")
      .update({ name: name.trim(), step_key: null })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      await handleSupabaseError(updateError.message, setError);
      return false;
    }

    setError(null);
    const updated = rowToApplicationStep(data as ApplicationStepRow);
    setSteps((prev) => prev.map((step) => (step.id === id ? updated : step)));
    return true;
  }

  // 캐스케이드 규칙: 이 전형보다 뒤(step_order가 큰) 전형은 먼저 전부 waiting으로 되돌린다.
  // 그 다음 status가 "passed"면 방금 waiting이 된 전형 중 가장 앞선 것 하나만 in_progress로
  // 승격한다("failed"나 "in_progress"로 바꾸는 경우는 승격하지 않는다 — 진행이 멈추거나,
  // 이미 지나간 전형으로 되돌리는 것이므로 뒤 단계는 그냥 waiting으로 남는다).
  // passed/failed였던 전형을 in_progress로 되돌리는 경우도 뒤 단계를 먼저 waiting으로
  // 정리하는 동일한 규칙을 그대로 타므로 별도 분기가 필요 없다.
  // 기업당 in_progress는 항상 최대 1개: status가 "in_progress"면, 뒤 단계 리셋(step_order가
  // 큰 경우)과 별개로 step_order가 더 앞선 다른 in_progress 전형도 waiting으로 되돌린다
  // (뒤 단계 리셋만으로는 대상보다 앞선 전형을 잡지 못한다 — 예: AI Drawer가 이미 다른
  // 전형이 in_progress인 상태에서 그보다 뒤 단계를 in_progress로 지정하는 경우).
  // status가 "passed"/"failed"면 target이 현재 in_progress일 때만 허용한다(아래 가드 참고) —
  // waiting인 전형을 곧바로 passed/failed로 바꾸는 호출은 DB를 건드리지 않고 실패로 끝난다.
  async function updateStepStatus(id: string, status: StepStatus) {
    if (!userId) return false;

    // steps(이 컨텍스트의 로컬 state)로 target을 찾으면, 같은 함수 호출 안에서 방금
    // addStep/기업 생성으로 만들어진 전형처럼 아직 이 클로저에 반영되지 않은 행은 찾지
    // 못해 조용히 실패한다(EmailAnalysisReview의 handleRegister가 정확히 이 순서로 호출함).
    // target/downstream 모두 Supabase에서 직접 다시 조회해 항상 최신 상태를 기준으로 한다.
    const { data: targetRow, error: targetError } = await supabase
      .from("application_steps")
      .select("company_id, step_order, step_status")
      .eq("id", id)
      .single();

    if (targetError || !targetRow) {
      await handleSupabaseError(targetError?.message ?? t("companies.detail.selectionDetail.stepNotFound"), setError);
      return false;
    }

    // waiting 전형을 건너뛰어 곧바로 passed/failed로 만드는 것만 막는다. Company Detail의
    // select는 waiting 전형 자체를 비활성으로 막아두지만, AI Drawer처럼 stepId를 직접
    // 지정해 이 함수를 호출하는 경로는 그 UI 가드를 거치지 않는다 — 여기서 한 번 더
    // 막아두지 않으면 앞의 전형은 그대로 waiting인데 뒤의 전형만 passed/failed가 되는
    // "순서에 구멍이 뚫린" 조합이 생긴다(실제로 이런 데이터가 만들어진 적이 있다).
    // in_progress/passed/failed 상태에서 passed/failed로 바꾸는 것은 모두 허용한다 —
    // 결과 정정(passed↔failed 직접 전환, passed/failed → in_progress 복귀)은 아래
    // 캐스케이드 규칙이 그대로 처리한다(뒤 단계 리셋, passed일 때만 재승격).
    if ((status === "passed" || status === "failed") && targetRow.step_status === "waiting") {
      setError(t("companies.detail.selectionDetail.waitingStepStatusBlocked"));
      return false;
    }

    const targetCompanyId = targetRow.company_id as string;
    const targetStepOrder = targetRow.step_order as number;

    const { data: downstreamRows, error: downstreamFetchError } = await supabase
      .from("application_steps")
      .select("id, step_order")
      .eq("company_id", targetCompanyId)
      .gt("step_order", targetStepOrder)
      .order("step_order", { ascending: true });

    if (downstreamFetchError) {
      await handleSupabaseError(downstreamFetchError.message, setError);
      return false;
    }

    const downstreamSteps = downstreamRows ?? [];

    if (downstreamSteps.length > 0) {
      const { error: resetError } = await supabase
        .from("application_steps")
        .update({ step_status: "waiting" })
        .eq("company_id", targetCompanyId)
        .gt("step_order", targetStepOrder);

      if (resetError) {
        await handleSupabaseError(resetError.message, setError);
        return false;
      }
    }

    let clearedOtherInProgressIds: string[] = [];
    if (status === "in_progress") {
      const { data: clearedRows, error: clearOtherError } = await supabase
        .from("application_steps")
        .update({ step_status: "waiting" })
        .eq("company_id", targetCompanyId)
        .eq("step_status", "in_progress")
        .neq("id", id)
        .select("id");

      if (clearOtherError) {
        await handleSupabaseError(clearOtherError.message, setError);
        return false;
      }
      clearedOtherInProgressIds = (clearedRows ?? []).map((row) => row.id as string);
    }

    const { error: updateError } = await supabase
      .from("application_steps")
      .update({ step_status: status })
      .eq("id", id);

    if (updateError) {
      await handleSupabaseError(updateError.message, setError);
      return false;
    }

    const promotedId = status === "passed" && downstreamSteps.length > 0 ? downstreamSteps[0].id : null;

    if (promotedId) {
      const { error: promoteError } = await supabase
        .from("application_steps")
        .update({ step_status: "in_progress" })
        .eq("id", promotedId);

      if (promoteError) {
        await handleSupabaseError(promoteError.message, setError);
        return false;
      }
    }

    // load()로 다시 불러오면 여기서 바뀐 만큼 loading이 true로 잠깐 켜지는데, 그 순간
    // 이 steps context를 구독하는 페이지(예: Company Detail의 최상단 `if (loading) ...`
    // 로딩 게이트)가 통째로 언마운트/리마운트되어 StepDetailPanel의 로컬 state(선택된
    // 전형, overallStatus 자동 제안 다이얼로그 등)가 날아간다. moveStep과 동일하게, 이미
    // 알고 있는 변경분(대상 전형/뒤 단계 리셋/승격된 다음 전형)만 로컬에 직접 반영한다.
    const downstreamIds = new Set(downstreamSteps.map((s) => s.id));
    const clearedOtherIds = new Set(clearedOtherInProgressIds);
    setError(null);
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id === id) return { ...s, stepStatus: status };
        if (s.id === promotedId) return { ...s, stepStatus: "in_progress" };
        if (downstreamIds.has(s.id)) return { ...s, stepStatus: "waiting" };
        if (clearedOtherIds.has(s.id)) return { ...s, stepStatus: "waiting" };
        return s;
      })
    );
    return true;
  }

  // steps(로컬 state)로 순서를 계산하면, StepTimeline의 드래그 정렬처럼 같은 실행 흐름
  // 안에서 moveStep을 여러 번 연달아 호출할 때 두 번째 호출부터는 첫 번째 호출의 결과를
  // 아직 반영하지 못한 예전 steps를 보고 계산해(리렌더가 그 사이에 끼어든다는 보장이
  // 없음) 같은 스왑을 반복하는 문제가 있었다(updateStepStatus에서 같은 이유로 이미 고친
  // 것과 동일). 현재 전형/순서 모두 Supabase에서 매번 새로 조회해 항상 최신 상태를
  // 기준으로 스왑한다.
  async function moveStep(id: string, direction: "up" | "down") {
    if (!userId) return false;

    const { data: targetRow, error: targetError } = await supabase
      .from("application_steps")
      .select("company_id")
      .eq("id", id)
      .single();

    if (targetError || !targetRow) {
      await handleSupabaseError(targetError?.message ?? t("companies.detail.selectionDetail.stepNotFound"), setError);
      return false;
    }

    const { data: companyStepRows, error: fetchError } = await supabase
      .from("application_steps")
      .select("id, step_order")
      .eq("company_id", targetRow.company_id)
      .order("step_order", { ascending: true });

    if (fetchError) {
      await handleSupabaseError(fetchError.message, setError);
      return false;
    }

    const companySteps = companyStepRows ?? [];
    const index = companySteps.findIndex((s) => s.id === id);
    if (index === -1) return false;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= companySteps.length) return false;

    const current = companySteps[index];
    const target = companySteps[swapIndex];

    const [{ error: errorA }, { error: errorB }] = await Promise.all([
      supabase.from("application_steps").update({ step_order: target.step_order }).eq("id", current.id),
      supabase.from("application_steps").update({ step_order: current.step_order }).eq("id", target.id),
    ]);

    if (errorA || errorB) {
      await handleSupabaseError((errorA ?? errorB)!.message, setError);
      return false;
    }

    setError(null);
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id === current.id) return { ...s, stepOrder: target.step_order };
        if (s.id === target.id) return { ...s, stepOrder: current.step_order };
        return s;
      })
    );
    return true;
  }

  return (
    <ApplicationStepsContext.Provider
      value={{
        steps,
        loading,
        error,
        refresh: load,
        addStep,
        deleteStep,
        renameStep,
        updateStepStatus,
        moveStep,
      }}
    >
      {children}
    </ApplicationStepsContext.Provider>
  );
}

export function useApplicationSteps() {
  const context = useContext(ApplicationStepsContext);
  if (!context) {
    throw new Error("useApplicationSteps must be used within an ApplicationStepsProvider");
  }
  return context;
}
