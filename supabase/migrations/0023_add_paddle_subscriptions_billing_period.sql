-- past_due 결제 알림(lib/notifications.ts의 computeBillingNotification)이 "이번 past_due
-- 발생 주기"를 안정적으로 구분하기 위한 컬럼. Paddle의 subscription.created/updated 웹훅
-- payload(SubscriptionNotification.currentBillingPeriod.starts_at)에는 이미 이 값이 실려
-- 있지만 지금까지는 저장하지 않았다 — 새 Paddle 이벤트를 구독하지 않고, 기존
-- subscription.created/updated/canceled 핸들러(lib/paddle/processWebhook.ts)가 이미 받는
-- 같은 payload에서 이 필드 하나만 추가로 읽어 저장한다.
--
-- 이 값이 안정적인 이유: current_billing_period는 "지금 이미 시작되어 아직 갱신되지 않은"
-- 결제 주기의 시작 시각이다. 결제 실패 후 재시도(dunning)나 scheduled_change 같은 무관한
-- 필드 변경으로는 바뀌지 않고, 실제로 결제가 성공해 다음 결제 주기로 넘어갈 때만 바뀐다 —
-- 즉 같은 past_due가 이어지는 동안은 항상 같은 값, 결제가 회복됐다가 나중에 다시 실패하면
-- (그 사이 한 번은 갱신에 성공했으므로) 반드시 다른 값이 된다.
alter table public.paddle_subscriptions
  add column current_billing_period_starts_at timestamptz;
