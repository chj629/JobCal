import type { SubscriptionStatus } from "@paddle/paddle-node-sdk";

// Pro entitlement와 새 subscription 생성 가능 여부는 다른 개념이다. paused는 현재 Pro
// 혜택을 주지 않지만 기존 subscription을 재개할 수 있으므로 새 Checkout은 막아야 한다.
// canceled는 영구 종료되어 새 subscription 생성이 가능하다.
export const CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
  "paused",
];

export function blocksNewSubscription(status: string) {
  return CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES.some((candidate) => candidate === status);
}
