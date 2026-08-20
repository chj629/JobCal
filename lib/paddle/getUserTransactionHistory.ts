import type { SupabaseClient } from "@supabase/supabase-js";

export interface UserTransaction {
  id: string;
  status: string;
  currencyCode: string;
  // Paddle 원본 최소 통화 단위 문자열 그대로(예: JPY는 "780"). 화면 표시 시점에만
  // Intl.NumberFormat으로 포맷한다 — 여기서 number로 변환하지 않는다.
  grandTotal: string;
  billedAt: string | null;
}

// Settings > Plan의 "支払い履歴" 표시 전용 조회. paddle_subscriptions 기반 Pro 판정
// (lib/paddle/getUserPlan.ts, getUserSubscriptionSummary.ts)과는 완전히 독립된 경로다 —
// 이 함수의 반환값은 권한 판정에 절대 쓰이지 않는다. RLS(paddle_transactions_select_own:
// auth.uid() = user_id)가 본인 행만 걸러주므로 여기서 user_id를 별도로 넘기지 않는다.
export async function getUserTransactionHistory(supabase: SupabaseClient): Promise<UserTransaction[]> {
  const { data, error } = await supabase
    .from("paddle_transactions")
    .select("paddle_transaction_id, status, currency_code, grand_total, billed_at")
    .eq("status", "completed")
    .order("billed_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.paddle_transaction_id,
    status: row.status,
    currencyCode: row.currency_code,
    grandTotal: row.grand_total,
    billedAt: row.billed_at,
  }));
}
