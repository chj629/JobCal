import type { SupabaseClient } from "@supabase/supabase-js";

export type Plan = "free" | "pro";

// Paddle 구독 status 중 Pro로 인정하는 값. active/trialing은 정상 결제 중, past_due는
// 최근 결제가 실패했지만 Paddle이 재시도(dunning) 중인 유예 상태 — 이 기간에도 Pro 접근을
// 계속 허용한다. paused/canceled 등 그 외 값은 전부 Free로 판정한다.
const PRO_STATUSES = ["active", "trialing", "past_due"] as const;

// 현재 세션 사용자의 Free/Pro를 판정한다. app/api/paddle/webhook이 채우는
// paddle_subscriptions(0017)가 유일한 source of truth이며, 이 함수는 그 값을 그대로
// 읽기만 한다 — plan_type/is_pro 같은 별도 컬럼을 두지 않는다.
//
// userId를 인자로 받지 않고 넘겨받은 supabase 클라이언트의 세션에만 의존한다: 이 클라이언트가
// 요청을 보내는 순간 Postgres가 paddle_subscriptions_select_own 정책(auth.uid() = user_id)을
// 적용하므로, "누구의 구독을 볼지"는 항상 그 세션 자신으로 고정된다 — 호출부가 다른 사용자의
// user_id를 실수로든 의도적으로든 넘겨 남의 구독을 조회하거나, 클라이언트가 넘긴 값으로
// Pro 여부를 결정하게 만들 방법 자체가 없다. Route Handler(app/api/ai/analyze-email 등)에서
// 이 함수를 부르면 서버 세션 기준으로 최종 판정되고, 클라이언트가 이 결과에 영향을 줄 수 없다.
export async function getUserPlan(supabase: SupabaseClient): Promise<Plan> {
  const { data, error } = await supabase
    .from("paddle_subscriptions")
    .select("status")
    .in("status", PRO_STATUSES)
    .limit(1)
    .maybeSingle();

  if (error) {
    // 조회 자체가 실패하면(네트워크 오류 등) Pro로 오판하지 않고 안전하게 Free로 처리한다.
    console.error("[paddle] 플랜 조회 실패:", error.message);
    return "free";
  }

  return data ? "pro" : "free";
}
