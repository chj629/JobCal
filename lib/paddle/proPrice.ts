// Paddle price id는 공개 Checkout에도 필요한 식별자라 NEXT_PUBLIC_ 환경변수를 사용한다.
// Checkout과 서버 entitlement가 반드시 이 helper를 통해 같은 배포 환경의 한 값을 읽는다.
const PADDLE_PRICE_ID_PATTERN = /^pri_[a-z\d]{26}$/;

export const PRO_ENTITLEMENT_STATUSES = ["active", "trialing", "past_due"] as const;

export interface SubscriptionEntitlementCandidate {
  status: string;
  price_id: string;
}

// 실제 Paddle 구독과 완전히 분리된 개발용 entitlement. auth.users.app_metadata는
// service role/Admin 경로에서만 수정할 수 있고 일반 사용자의 updateUser({ data })가
// 쓰는 user_metadata와는 별개이므로, 서버가 getUser()로 검증한 값만 신뢰한다.
// expires_at을 필수로 두어 SQL Editor에서 제거하는 것을 잊어도 자동으로 Free로 돌아간다.
export function hasActiveInternalProEntitlement(
  appMetadata: unknown,
  nowMs: number = Date.now()
): boolean {
  if (!appMetadata || typeof appMetadata !== "object" || Array.isArray(appMetadata)) return false;

  const entitlement = (appMetadata as Record<string, unknown>).jobcal_internal_entitlement;
  if (!entitlement || typeof entitlement !== "object" || Array.isArray(entitlement)) return false;

  const { plan, expires_at: expiresAt } = entitlement as Record<string, unknown>;
  if (plan !== "pro" || typeof expiresAt !== "string") return false;

  const expiresAtMs = Date.parse(expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
}

export function getConfiguredPaddleProPriceId(): string | null {
  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRO_PRICE_ID?.trim();
  return priceId && PADDLE_PRICE_ID_PATTERN.test(priceId) ? priceId : null;
}

export function hasProEntitlement(
  subscriptions: SubscriptionEntitlementCandidate[],
  configuredProPriceId: string | null = getConfiguredPaddleProPriceId()
) {
  if (!configuredProPriceId) return false;

  return subscriptions.some(
    (subscription) =>
      PRO_ENTITLEMENT_STATUSES.some((status) => status === subscription.status) &&
      subscription.price_id === configuredProPriceId
  );
}
