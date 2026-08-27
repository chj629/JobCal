// Paddle price id는 공개 Checkout에도 필요한 식별자라 NEXT_PUBLIC_ 환경변수를 사용한다.
// Checkout과 서버 entitlement가 반드시 이 helper를 통해 같은 배포 환경의 한 값을 읽는다.
const PADDLE_PRICE_ID_PATTERN = /^pri_[a-z\d]{26}$/;

export const PRO_ENTITLEMENT_STATUSES = ["active", "trialing", "past_due"] as const;

export interface SubscriptionEntitlementCandidate {
  status: string;
  price_id: string;
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
