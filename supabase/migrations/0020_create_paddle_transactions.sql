-- Paddle 결제 건별 이력 테이블. paddle_subscriptions와 달리 Pro 권한 판정에는 절대
-- 쓰이지 않는다 — lib/paddle/getUserPlan.ts/getUserSubscriptionSummary.ts는 여전히
-- paddle_subscriptions만 읽는다. 이 테이블은 오직 Settings > Plan의 "支払い履歴" 표시용
-- 부가 데이터다.
--
-- user_id 연결은 기존 paddle_subscriptions와 완전히 동일한 원칙을 따른다: Paddle customer의
-- email 매칭이 아니라, 체크아웃 시 Paddle.Checkout.open({ customData: { user_id } })로 실어
-- 보낸 값을 webhook(transaction.completed)에서 그대로 읽어 쓴다.
--
-- grand_total은 Paddle이 보내는 원본 문자열(최소 통화 단위)을 그대로 저장한다 — JS
-- number/float로 변환하지 않는다(부동소수점 오차 방지). 통화별 소수 자릿수 해석은 화면
-- 표시 시점(Intl.NumberFormat)에서만 한다.
--
-- paddle_subscription_id에는 FK를 걸지 않는다 — 구독이 취소/삭제되어도 과거 결제 이력은
-- 그대로 남아 있어야 하기 때문이다(paddle_subscriptions 행이 나중에 없어지더라도 이 값은
-- Paddle이 실제로 보낸 원본 subscription id 참고값으로 계속 유효하다).
create table public.paddle_transactions (
  paddle_transaction_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  paddle_customer_id text not null references public.paddle_customers(paddle_customer_id),
  paddle_subscription_id text,
  status text not null,
  currency_code text not null,
  grand_total text not null,
  billed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index paddle_transactions_user_id_idx on public.paddle_transactions (user_id);

create trigger paddle_transactions_set_updated_at
  before update on public.paddle_transactions
  for each row
  execute function public.set_updated_at();

alter table public.paddle_transactions enable row level security;

create policy "paddle_transactions_select_own" on public.paddle_transactions
  for select
  using (auth.uid() = user_id);

grant select on table public.paddle_transactions to authenticated;

-- webhook(lib/supabase/admin.ts, service role)이 upsert해야 하므로 select/insert/update만
-- grant한다. delete는 필요하지 않다 — 웹훅은 이 테이블에서 행을 삭제하지 않는다
-- (0017/0018/0019의 paddle_customers/paddle_subscriptions와 동일한 원칙).
grant select, insert, update on table public.paddle_transactions to service_role;
