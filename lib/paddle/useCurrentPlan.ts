"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserPlan, type Plan } from "./getUserPlan";

interface UseCurrentPlanResult {
  // null = 아직 조회 전(로딩).
  plan: Plan | null;
  // Checkout을 열기 직전처럼, 마운트 시 조회한 state를 그대로 믿지 않고 한 번 더
  // 최신값을 확인하고 싶을 때 쓴다. getUserPlan(Pro 권한 판정 자체)은 전혀 바꾸지 않고
  // 그대로 재사용한다 — 이 훅은 그 결과를 컴포넌트 state로 옮기고 재조회 창구를 열어줄
  // 뿐이다.
  refetch: () => Promise<Plan>;
}

// /pricing과 랜딩 Pricing 섹션이 "이미 Pro인 사용자의 중복 Checkout"을 막기 위해 공유하는
// 훅. 두 곳에서 로직이 따로 구현되어 어긋나는 것을 막는다.
export function useCurrentPlan(): UseCurrentPlanResult {
  const [plan, setPlan] = useState<Plan | null>(null);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const result = await getUserPlan(supabase);
    setPlan(result);
    return result;
  }, []);

  useEffect(() => {
    const supabase = createClient();
    // 로그인 직후(signInWithPassword → router.push/refresh로 이 컴포넌트가 막 마운트된
    // 시점)에는 방금 생성한 브라우저 클라이언트의 세션 hydration(localStorage에서 세션을
    // 읽어들이는 내부 초기화)이 아직 끝나지 않았을 수 있다 — 이 상태에서 곧바로 쿼리를
    // 보내면 Authorization 헤더 없이(=anon 권한으로) 나가 "permission denied for table
    // paddle_subscriptions"가 발생할 수 있다(Production smoke test에서 실제 관찰됨).
    // supabase.auth.getSession()은 내부적으로 그 초기화 Promise를 기다린 뒤에만
    // 응답하므로(node_modules/@supabase/auth-js의 GoTrueClient.getSession() 구현 확인),
    // 이 한 줄을 먼저 await하는 것만으로 hydration 완료를 보장할 수 있다 — 별도의 전역
    // auth state나 onAuthStateChange 구독을 새로 만들지 않는다.
    //
    // hydration을 기다린 뒤에도 session이 없다면(비로그인 방문자 — 랜딩/ /pricing은
    // 로그인 없이도 열람 가능) getUserPlan()을 아예 호출하지 않는다. paddle_subscriptions는
    // authenticated 롤에만 select가 부여돼 있어(0017 마이그레이션) anon 세션으로 조회하면
    // RLS 이전에 GRANT 단계에서 "permission denied"가 나는데, 이 값은 없다는게 확실하므로
    // 그 결과를 다시 free로 캐치하나 로컬에서 곧바로 free로 두나 최종 판정은 동일하다
    // (Production에서 실제로 이 permission denied만 콘솔에 남고 화면/판정에는 영향이
    // 없었음을 확인) — 불필요한 조회만 건너뛴다. getUserPlan 자체와 그 안의 Pro 판정
    // 로직은 손대지 않는다.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setPlan("free");
        return;
      }
      return getUserPlan(supabase).then(setPlan);
    });
  }, []);

  return { plan, refetch };
}
