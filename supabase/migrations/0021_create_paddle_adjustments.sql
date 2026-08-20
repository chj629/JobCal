-- Paddle 환불/조정(Adjustment) 이력 테이블. paddle_transactions(결제 이력)와 완전히
-- 분리된 부가 테이블이며, Pro 권한 판정에는 절대 쓰이지 않는다 —
-- lib/paddle/getUserPlan.ts/getUserSubscriptionSummary.ts는 여전히 paddle_subscriptions만
-- 읽는다. 이 테이블은 오직 Settings > Plan의 결제 이력에 환불 상태를 표시하기 위한 것이다.
--
-- user_id 연결 방식이 기존 세 테이블과 다르다: AdjustmentNotification에는 customData가
-- 없어(체크아웃 시점의 customData는 transaction/subscription에만 실리고, adjustment는
-- 결제 이후에 파생되는 이벤트라 실리지 않는다) customData.user_id를 직접 쓸 수 없다.
-- 대신 data.transactionId로 기존 paddle_transactions 행을 조회해 그 행의 user_id를
-- 그대로 가져와 쓴다(webhook 처리 로직, lib/paddle/processWebhook.ts 참고).
--
-- paddle_adjustment_id(PK) 기준 upsert이므로 adjustment.created/updated가 여러 번
-- 재전송되거나, created 이후 updated로 status가 바뀌어도(pending_approval -> approved 등)
-- 항상 행 1개로 수렴한다(idempotent).
--
-- total은 Paddle이 보내는 원본 문자열(최소 통화 단위)을 그대로 저장한다 — JS
-- number/float로 변환하지 않는다(부동소수점 오차 방지). 여러 부분 환불의 합계 비교는
-- 화면 표시 시점에 문자열을 정수로 안전하게 파싱해 계산한다.
--
-- paddle_transaction_id에는 FK를 건다 — adjustment는 반드시 이미 존재하는 거래에
-- 대해서만 발생하는 개념이라, 참조 무결성이 실제로 의미가 있다(paddle_subscription_id를
-- FK로 걸지 않은 paddle_transactions와는 다른 경우).
create table public.paddle_adjustments (
  paddle_adjustment_id text primary key,
  paddle_transaction_id text not null references public.paddle_transactions(paddle_transaction_id),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  adjustment_type text not null,
  status text not null,
  currency_code text not null,
  total text not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index paddle_adjustments_paddle_transaction_id_idx on public.paddle_adjustments (paddle_transaction_id);
create index paddle_adjustments_user_id_idx on public.paddle_adjustments (user_id);

create trigger paddle_adjustments_set_updated_at
  before update on public.paddle_adjustments
  for each row
  execute function public.set_updated_at();

alter table public.paddle_adjustments enable row level security;

create policy "paddle_adjustments_select_own" on public.paddle_adjustments
  for select
  using (auth.uid() = user_id);

grant select on table public.paddle_adjustments to authenticated;

-- webhook(lib/supabase/admin.ts, service role)이 upsert해야 하므로 select/insert/update만
-- grant한다. delete는 필요하지 않다 — 웹훅은 이 테이블에서 행을 삭제하지 않는다
-- (0017~0020의 기존 세 테이블과 동일한 원칙).
grant select, insert, update on table public.paddle_adjustments to service_role;
