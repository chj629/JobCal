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
    getUserPlan(supabase).then(setPlan);
  }, []);

  return { plan, refetch };
}
