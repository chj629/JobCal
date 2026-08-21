"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserSubscriptionSummary, type UserSubscriptionSummary } from "./getUserSubscriptionSummary";

// lib/paddle/useCurrentPlan.ts와 같은 모양의 얇은 훅. components/Header.tsx가 past_due
// 결제 알림(lib/notifications.ts의 computeBillingNotification)을 계산하려면 plan뿐 아니라
// status/subscriptionId까지 필요해 useCurrentPlan을 재사용하지 않고 별도로 둔다 —
// useCurrentPlan은 그대로 두고 건드리지 않는다(Pro 판정 관련 기존 동작 변경 없음).
export function useSubscriptionSummary() {
  // null = 아직 조회 전(로딩).
  const [summary, setSummary] = useState<UserSubscriptionSummary | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // useCurrentPlan.ts와 동일한 이유 — 로그인 직후 이 훅이 마운트될 때 브라우저
    // 클라이언트의 세션 hydration이 아직 끝나지 않았을 수 있어, 먼저
    // supabase.auth.getSession()으로 그 초기화 완료를 기다린 뒤에만 조회한다(자세한
    // 설명은 useCurrentPlan.ts 주석 참고). 쿼리 자체(getUserSubscriptionSummary)는
    // 그대로 두고 호출 시점만 늦춘다.
    supabase.auth.getSession().then(() => getUserSubscriptionSummary(supabase)).then(setSummary);
  }, []);

  return summary;
}
