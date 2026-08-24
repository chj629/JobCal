"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useHandleSupabaseError } from "@/lib/supabase/errorHandling";
import { useT } from "@/lib/locale-context";
import {
  getCurrentStep,
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
  reorderSteps: (companyId: string, orderedIds: string[]) => Promise<boolean>;
}

const ApplicationStepsContext = createContext<ApplicationStepsContextValue | null>(null);

export function ApplicationStepsProvider({ children }: { children: ReactNode }) {
  const handleSupabaseError = useHandleSupabaseError();
  const t = useT();
  const supabase = useMemo(() => createClient(), []);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // onAuthStateChange 콜백이 "이 세션이 이전과 같은 사용자인지" 판단할 기준.
  // lib/companies-context.tsx와 동일한 이유(콜백 클로저에서 state를 직접 읽으면 구독 시점
  // 값에 고정되는 stale closure 문제)로 ref에 최신값을 따로 들고 있는다.
  const currentUserIdRef = useRef<string | null>(null);

  // application_steps만 다시 읽어와 로컬 state를 교체한다. loading/userId는 건드리지
  // 않는다 — 호출부(load 또는 backgroundRefresh)가 각자의 의미에 맞게 관리한다. 실패하면
  // 기존 steps는 그대로 두고(이미 보고 있던 화면이 사라지면 안 된다) error만 알리며 null을
  // 반환한다.
  async function fetchSteps(): Promise<ApplicationStep[] | null> {
    const { data, error: fetchError } = await supabase
      .from("application_steps")
      .select("*")
      .order("step_order", { ascending: true });

    if (fetchError) {
      await handleSupabaseError(fetchError.message, setError);
      return null;
    }

    const mapped = ((data ?? []) as ApplicationStepRow[]).map(rowToApplicationStep);
    setError(null);
    setSteps(mapped);
    return mapped;
  }

  // 최초 진입/새로고침, 그리고 실제 로그인·로그아웃·계정 전환 전용 — 기존과 동일하게 화면
  // 전체를 loading으로 가린다. 반환값(빈 배열 포함)은 refresh()를 기다리는 기존 호출부를
  // 위해 그대로 유지한다.
  async function load() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    // getUser()는 "진짜 로그아웃/세션 무효"와 "Supabase Auth API에 순간적으로 접근하지
    // 못한 것뿐인 retryable 오류"를 둘 다 user: null로 반환한다(lib/supabase/proxy.ts와
    // 동일한 이유) — retryable이면 실제로 로그아웃된 게 아니므로 currentUserIdRef/
    // userId/steps를 전혀 건드리지 않고 loading만 정리한다. 화면에 이미 있던 정상
    // 데이터를 일시적 오류로 비우지 않기 위함이며, 인증 성공으로 간주하는 것도
    // 아니다 — 다음 정상 호출에서 다시 검증된다. refresh()를 기다리는 호출부를 위해
    // 기존 steps를 그대로 반환한다(빈 배열로 오인시키지 않음).
    if (!user && getUserError && isAuthRetryableFetchError(getUserError)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[auth] getUser() 확인이 일시적으로 실패해(retryable) 기존 steps를 유지합니다.",
          { errorName: getUserError.name }
        );
      }
      setLoading(false);
      return steps;
    }

    currentUserIdRef.current = user?.id ?? null;

    if (!user) {
      setUserId(null);
      setSteps([]);
      setLoading(false);
      return [];
    }

    setUserId(user.id);
    const result = await fetchSteps();
    setLoading(false);
    return result ?? [];
  }

  // 이미 화면에 steps가 있는 상태에서의 조용한 재조회. 탭 복귀 시 supabase-js가 재발행하는
  // SIGNED_IN처럼 "같은 사용자의 세션 재확인"일 때 여기로 온다 — RLS가 어차피 auth.uid()
  // 기준으로 결과를 좁혀주므로 getUser() 재검증 없이 바로 조회한다.
  async function backgroundRefresh() {
    await fetchSteps();
  }

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      await load();
    }

    initialLoad();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      // load()가 마운트 직후 이미 최초 조회를 하고 있으므로, 구독 시 항상 한 번 오는
      // INITIAL_SESSION은 중복 조회를 피하기 위해서만 건너뛴다.
      if (event === "INITIAL_SESSION") return;

      // 이벤트 이름을 블랙리스트로 걸러내는 대신, 세션의 사용자 id가 직전에 알던 사용자와
      // 같은지로 판단한다(lib/companies-context.tsx와 동일한 원칙).
      const nextUserId = session?.user?.id ?? null;

      if (nextUserId === currentUserIdRef.current) {
        if (nextUserId) backgroundRefresh();
        return;
      }

      // 실제 로그인/로그아웃/다른 계정으로 전환된 경우 — 이전 사용자의 steps가 화면에
      // 잠깐이라도 남아있으면 안 되므로 즉시 비우고 다시 불러온다.
      setSteps([]);
      load();
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

  // 삭제 대상이 in_progress였다면 그 자리를 대신할 전형이 하나도 없어진다 — getCurrentStep은
  // in_progress/failed가 전혀 없고 아직 passed도 아닌 전형만 남으면 null을 반환하도록
  // 고쳐졌으므로(예전처럼 그중 마지막 전형을 진행 중인 것처럼 잘못 표시하지 않는다), 삭제
  // 자체가 뒤쪽 waiting을 승격해 이 상태를 만들지 않게 한다. updateStepStatus의 "in_progress
  // → passed" 승격과 정확히 같은 규칙(step_order가 더 크면서 step_status가 waiting인 것 중
  // 가장 가까운 것 하나)을 그대로 쓴다. 대상이 waiting/passed/failed였으면 다른 전형은
  // 전혀 건드리지 않는다 — 기업당 in_progress는 항상 최대 1개라는 불변식이 그대로 유지된다.
  async function deleteStep(id: string) {
    if (!userId) return false;

    const { data: targetRow, error: targetError } = await supabase
      .from("application_steps")
      .select("company_id, step_order, step_status")
      .eq("id", id)
      .single();

    if (targetError || !targetRow) {
      await handleSupabaseError(targetError?.message ?? t("companies.detail.selectionDetail.stepNotFound"), setError);
      return false;
    }

    const { error: deleteError } = await supabase.from("application_steps").delete().eq("id", id);

    if (deleteError) {
      await handleSupabaseError(deleteError.message, setError);
      return false;
    }

    let promotedId: string | null = null;
    if (targetRow.step_status === "in_progress") {
      const { data: nextWaitingRows, error: nextWaitingError } = await supabase
        .from("application_steps")
        .select("id")
        .eq("company_id", targetRow.company_id)
        .gt("step_order", targetRow.step_order as number)
        .eq("step_status", "waiting")
        .order("step_order", { ascending: true })
        .limit(1);

      if (nextWaitingError) {
        await handleSupabaseError(nextWaitingError.message, setError);
        return false;
      }

      promotedId = nextWaitingRows?.[0]?.id ?? null;

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
    }

    setError(null);
    setSteps((prev) =>
      prev
        .filter((step) => step.id !== id)
        .map((step) => (step.id === promotedId ? { ...step, stepStatus: "in_progress" } : step))
    );
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

  // step_order는 사용자가 reorderSteps/moveStep으로 자유롭게 바꿀 수 있어 더 이상 "이미
  // 진행했는지"의 근거가 될 수 없다 — 예전에는 "이 전형보다 order가 큰 전형은 전부 아직
  // waiting"이라는 전제로 order 기준 downstream을 통째로 waiting 리셋했지만, 재정렬 후에는
  // order가 큰 자리에 이미 확정된(passed/failed) 전형이 올 수 있어 그 기록을 지워버리는
  // 데이터 손실 버그가 있었다(order만 보고 상태를 건드리면 안 된다). 지금은 각 전이가 정확히
  // 무엇을 바꿔야 하는지 상태 기준으로만 명시한다 — order는 passed 승격 대상을 찾을 때만
  // "다음"의 방향을 판단하는 용도로 쓰고, 그 상태(step_status)가 waiting인지도 함께 확인한다.
  // - waiting → in_progress: 기존에 in_progress였던 다른 전형만 waiting으로 되돌린다
  //   (order 무관, 상태 기준 — passed/failed는 절대 건드리지 않는다).
  // - in_progress → passed: order가 더 크면서 현재 step_status가 waiting인 것 중 가장
  //   앞선 것 하나만 in_progress로 승격한다. 중간에 이미 확정된 전형이 있으면 건너뛴다.
  // - waiting → passed(재정렬로 currentStep보다 앞으로 옮겨진 전형을 직접 확정하는 경우):
  //   target 자신만 passed로 바뀌고 승격은 일어나지 않는다 — 이미 다른 in_progress(진짜
  //   현재 진행 지점)가 있을 수 있는 상태라, 여기서도 승격하면 in_progress가 2개가 된다.
  // - in_progress → failed, passed↔failed 결과 정정, passed/failed → in_progress로 되돌리는
  //   경우 모두 다른 전형의 상태를 자동으로 바꾸지 않는다("결과 정정 시 뒤 전형을 자동으로
  //   waiting으로 되돌리는" 기존 리플 기능은 재정렬 기능과 양립할 수 없어 의도적으로 뺐다 —
  //   필요하면 사용자가 영향받는 전형을 직접 하나씩 되돌린다).
  // status가 "passed"/"failed"면 target이 "미래 waiting"(현재 진행 지점보다 뒤)일 때만
  // 막는다(아래 가드 참고) — StepDetailPanel의 isFutureWaitingStep과 완전히 같은 기준.
  async function updateStepStatus(id: string, status: StepStatus) {
    if (!userId) return false;

    // steps(이 컨텍스트의 로컬 state)로 target을 찾으면, 같은 함수 호출 안에서 방금
    // addStep/기업 생성으로 만들어진 전형처럼 아직 이 클로저에 반영되지 않은 행은 찾지
    // 못해 조용히 실패한다(EmailAnalysisReview의 handleRegister가 정확히 이 순서로 호출함).
    // target은 Supabase에서 직접 다시 조회해 항상 최신 상태를 기준으로 한다.
    const { data: targetRow, error: targetError } = await supabase
      .from("application_steps")
      .select("company_id, step_order, step_status")
      .eq("id", id)
      .single();

    if (targetError || !targetRow) {
      await handleSupabaseError(targetError?.message ?? t("companies.detail.selectionDetail.stepNotFound"), setError);
      return false;
    }

    const targetCompanyId = targetRow.company_id as string;
    const targetStepOrder = targetRow.step_order as number;
    // 아래 두 곳(가드/승격 조건)에서 "변경 전 상태"로 계속 참조하므로 먼저 이름을 붙여둔다.
    const targetPreviousStatus = targetRow.step_status as StepStatus;

    // waiting 전형을 곧바로 passed/failed로 만드는 것 중 "진짜 미래(아직 순서가 오지 않은)"
    // 전형만 막는다 — currentStep(getCurrentStep)보다 step_order가 큰 waiting만 차단 대상이고,
    // 재정렬로 currentStep보다 앞으로 옮겨진 waiting은 이미 지나간 순서로 보아 허용한다.
    // Company Detail의 select(isFutureWaitingStep)는 이 조건을 UI에서 미리 막아두지만,
    // AI Drawer처럼 stepId를 직접 지정해 이 함수를 호출하는 경로는 그 UI 가드를 거치지
    // 않으므로 여기서 같은 기준으로 다시 검증한다(getCurrentStep을 그대로 재사용해 두 계층의
    // "미래 전형" 정의가 어긋나지 않게 한다).
    if ((status === "passed" || status === "failed") && targetPreviousStatus === "waiting") {
      const { data: companyStepRows, error: companyStepsError } = await supabase
        .from("application_steps")
        .select("step_order, step_status")
        .eq("company_id", targetCompanyId);

      if (companyStepsError) {
        await handleSupabaseError(companyStepsError.message, setError);
        return false;
      }

      const currentStep = getCurrentStep(
        (companyStepRows ?? []).map((row) => ({
          stepOrder: row.step_order as number,
          stepStatus: row.step_status as StepStatus,
        }))
      );
      const isFutureWaitingStep = !!currentStep && targetStepOrder > currentStep.stepOrder;

      if (isFutureWaitingStep) {
        setError(t("companies.detail.selectionDetail.waitingStepStatusBlocked"));
        return false;
      }
    }

    // in_progress로 바꿀 때만: 기존에 in_progress였던 "다른" 전형을 waiting으로 되돌린다.
    // order와 무관하게 step_status만으로 찾으므로 passed/failed는 대상이 될 수 없다 —
    // 기업당 in_progress는 항상 최대 1개라는 불변식은 이 블록만으로 유지된다.
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

    // passed로 바뀔 때만, 그리고 target의 변경 전 상태가 in_progress였을 때만: order가
    // 더 크면서 지금 step_status가 waiting인 것 중 가장 앞선 것 하나만 조회해 승격한다.
    // "변경 전 in_progress"로 제한하는 이유: waiting → passed(재배치된 과거 전형을 곧바로
    // 확정하는 경우)까지 승격을 트리거하면, 이미 다른 in_progress(진짜 현재 진행 지점)가
    // 있는 상태에서 승격이 또 하나의 in_progress를 만들어 "기업당 in_progress 최대 1개"
    // 불변식이 깨진다 — 승격은 오직 "지금 진행 중이던 전형이 방금 통과했다"는 경우에만
    // 의미가 있다. 중간에 이미 확정된(passed/failed) 전형이 있어도 이 쿼리는
    // step_status='waiting' 조건 덕분에 자동으로 건너뛴다 — 그 전형의 상태는 건드리지 않는다.
    let promotedId: string | null = null;
    if (status === "passed" && targetPreviousStatus === "in_progress") {
      const { data: nextWaitingRows, error: nextWaitingError } = await supabase
        .from("application_steps")
        .select("id")
        .eq("company_id", targetCompanyId)
        .gt("step_order", targetStepOrder)
        .eq("step_status", "waiting")
        .order("step_order", { ascending: true })
        .limit(1);

      if (nextWaitingError) {
        await handleSupabaseError(nextWaitingError.message, setError);
        return false;
      }

      promotedId = nextWaitingRows?.[0]?.id ?? null;

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
    }

    // load()로 다시 불러오면 여기서 바뀐 만큼 loading이 true로 잠깐 켜지는데, 그 순간
    // 이 steps context를 구독하는 페이지(예: Company Detail의 최상단 `if (loading) ...`
    // 로딩 게이트)가 통째로 언마운트/리마운트되어 StepDetailPanel의 로컬 state(선택된
    // 전형, overallStatus 자동 제안 다이얼로그 등)가 날아간다. moveStep과 동일하게, 이미
    // 알고 있는 변경분(대상 전형/정리된 다른 in_progress/승격된 다음 전형)만 로컬에 직접
    // 반영한다.
    const clearedOtherIds = new Set(clearedOtherInProgressIds);
    setError(null);
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id === id) return { ...s, stepStatus: status };
        if (s.id === promotedId) return { ...s, stepStatus: "in_progress" };
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

  // StepTimeline의 드래그 정렬 전용. moveStep은 인접 1칸 스왑마다 SELECT 2번 + UPDATE 2번을
  // 매번 다시 조회해가며 순차로 반복하므로, 드래그로 여러 칸을 옮기면 그 체인이 이동 거리만큼
  // 그대로 늘어나 체감 지연이 커진다(원인 조사 완료). 이 함수는 드래그 한 번(onDragEnd)에 한
  // 번만 호출되고 — moveStep처럼 같은 실행 흐름 안에서 연달아 여러 번 불릴 일이 없어 staleness
  // 위험이 없다 — orderedIds가 이미 최종 순서를 전부 담고 있으므로 재조회 없이 그 순서 그대로
  // step_order를 1..N으로 병렬(Promise.all) 업데이트한다.
  // 낙관적 업데이트 + 실패 시 rollback도 이 함수가 전담한다: 호출 즉시 로컬 state를 최종
  // 순서로 반영해 드롭 순간 화면이 바로 정착하게 하고, 실패하면 호출 시점 스냅샷으로 되돌린다.
  async function reorderSteps(companyId: string, orderedIds: string[]) {
    if (!userId) return false;

    const previousSteps = steps;
    const orderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));

    setSteps((prev) =>
      prev.map((s) => {
        const nextOrder = orderMap.get(s.id);
        return nextOrder === undefined ? s : { ...s, stepOrder: nextOrder };
      })
    );

    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from("application_steps")
          .update({ step_order: index + 1 })
          .eq("id", id)
          .eq("company_id", companyId)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      setSteps(previousSteps);
      await handleSupabaseError(failed.error.message, setError);
      return false;
    }

    setError(null);
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
        reorderSteps,
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
