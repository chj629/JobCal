import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "./getUserPlan";
import { getConfiguredPaddleProPriceId, PRO_ENTITLEMENT_STATUSES } from "./proPrice";

// app/api/paddle/webhook(lib/paddle/processWebhook.ts)이 Paddle Node SDK의
// SubscriptionScheduledChangeNotification 인스턴스를 그대로 upsert하는데, 이 클래스는
// action/effectiveAt/resumeAt을 camelCase 프로퍼티로만 갖고 커스텀 toJSON()이 없다
// (node_modules/@paddle/paddle-node-sdk의 컴파일된 소스로 실제 확인함) — 그래서
// paddle_subscriptions.scheduled_change jsonb에는 Paddle 원본 API 문서의 snake_case가
// 아니라 이 camelCase 키 그대로 저장된다. action 값 자체(cancel/pause/resume)는 Paddle이
// 보낸 원본 문자열을 그대로 옮긴 것이라 Paddle API 문서와 동일하다.
export interface ScheduledChange {
  action: "cancel" | "pause" | "resume" | (string & {});
  effectiveAt: string;
  resumeAt: string | null;
}

export interface UserSubscriptionSummary {
  plan: Plan;
  // Paddle 원본 status 문자열. 구독이 아예 없으면 null.
  status: string | null;
  scheduledChange: ScheduledChange | null;
  // paddle_subscriptions의 PK. 알림센터(lib/notifications.ts의 computeBillingNotification)가
  // past_due 알림의 deterministic key를 만드는 데 쓴다 — 이 필드 추가 전부터 있던
  // plan/status/scheduledChange 용도(Settings > Plan 표시)에는 영향 없음.
  subscriptionId: string | null;
  // 0023: 현재 결제 주기 시작 시각. computeBillingNotification이 "이 past_due가 몇 번째
  // 발생 주기인지" 구분하는 데 쓴다(무관한 subscription.updated로는 바뀌지 않고, 실제로
  // 다음 결제 주기로 넘어갈 때만 바뀜) — Settings > Plan 표시에는 쓰지 않는다.
  currentBillingPeriodStartsAt: string | null;
}

// Settings 플랜 탭 표시 전용 조회. lib/paddle/getUserPlan.ts(AI quota 접근 제어에 쓰이는
// 판정 함수)는 그대로 두고 건드리지 않는다 — 화면에 "해지 예정"/"결제수단 확인 필요" 같은
// 문구를 보여주려면 status/scheduled_change까지 더 필요해서 별도로 조회한다. 대상
// 테이블/RLS 정책(paddle_subscriptions_select_own: auth.uid() = user_id)은 완전히 같다.
export async function getUserSubscriptionSummary(
  supabase: SupabaseClient
): Promise<UserSubscriptionSummary> {
  const configuredProPriceId = getConfiguredPaddleProPriceId();
  if (!configuredProPriceId) {
    console.error("[paddle] JobCal Pro price ID가 설정되지 않았거나 형식이 올바르지 않습니다.");
    return emptySubscriptionSummary();
  }

  const { data, error } = await supabase
    .from("paddle_subscriptions")
    .select("paddle_subscription_id, status, scheduled_change, current_billing_period_starts_at")
    .in("status", PRO_ENTITLEMENT_STATUSES)
    .eq("price_id", configuredProPriceId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return emptySubscriptionSummary();
  }

  return {
    plan: "pro",
    status: data.status,
    scheduledChange: data.scheduled_change,
    subscriptionId: data.paddle_subscription_id,
    currentBillingPeriodStartsAt: data.current_billing_period_starts_at,
  };
}

function emptySubscriptionSummary(): UserSubscriptionSummary {
  return {
    plan: "free",
    status: null,
    scheduledChange: null,
    subscriptionId: null,
    currentBillingPeriodStartsAt: null,
  };
}
