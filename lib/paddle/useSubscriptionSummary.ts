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
    getUserSubscriptionSummary(supabase).then(setSummary);
  }, []);

  return summary;
}
