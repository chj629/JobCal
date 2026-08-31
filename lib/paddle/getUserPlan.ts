import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getConfiguredPaddleProPriceId,
  hasActiveInternalProEntitlement,
  hasProEntitlement,
  PRO_ENTITLEMENT_STATUSES,
} from "./proPrice";

export type Plan = "free" | "pro";

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
  // getSession()의 클라이언트 캐시나 사용자가 수정 가능한 user_metadata가 아니라,
  // Supabase Auth 서버가 검증해 돌려준 auth.users.app_metadata만 확인한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (hasActiveInternalProEntitlement(user?.app_metadata)) {
    return "pro";
  }

  const configuredProPriceId = getConfiguredPaddleProPriceId();
  if (!configuredProPriceId) {
    // 설정 누락/형식 오류 때 모든 active 구독을 Pro로 인정하는 fallback은 두지 않는다.
    // 내부 진단만 남기며 실제 price id 값은 로그에 노출하지 않는다.
    console.error("[paddle] JobCal Pro price ID가 설정되지 않았거나 형식이 올바르지 않습니다.");
    return "free";
  }

  const { data, error } = await supabase
    .from("paddle_subscriptions")
    .select("status, price_id")
    .in("status", PRO_ENTITLEMENT_STATUSES);

  if (error) {
    // 조회 자체가 실패하면(네트워크 오류 등) Pro로 오판하지 않고 안전하게 Free로 처리한다.
    console.error("[paddle] 플랜 조회 실패:", error.message);
    return "free";
  }

  const isPro = hasProEntitlement(data ?? [], configuredProPriceId);
  if (!isPro && data && data.length > 0) {
    // 유효 상태 구독은 있지만 허용된 JobCal Pro price가 하나도 없는 구성 오류를 서버에서
    // 진단할 수 있게 한다. 사용자/customer/subscription/price 식별자는 기록하지 않는다.
    console.warn("[paddle] 유효 상태의 구독이 있지만 JobCal Pro price와 일치하지 않습니다.");
  }

  return isPro ? "pro" : "free";
}
