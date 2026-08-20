-- Paddle 구독 상태 미러 테이블: paddle_customers / paddle_subscriptions.
-- Paddle webhook(추후 app/api/paddle/webhook/route.ts)이 service role로만 쓰는 테이블이며,
-- 클라이언트(authenticated)는 자신의 행을 select만 할 수 있다 — Free/Pro 판정에 쓰이는
-- 값이므로 클라이언트가 직접 insert/update/delete로 자신의 구독 상태를 조작할 수 없어야
-- 한다(insert/update/delete 정책 자체를 두지 않음).
--
-- Paddle customer_id <-> JobCal user_id 연결은 Paddle customer의 email 매칭이 아니라,
-- 체크아웃 시 Paddle.Checkout.open({ customData: { user_id } })로 실어 보낸 값을
-- subscription.created/updated webhook에서 그대로 읽어 쓰는 방식으로 처리한다(다음 단계).
-- email은 참고/디버깅용으로만 두고 nullable로 둔다 — RLS나 접근 제어 판정에는 쓰지 않는다.

create table public.paddle_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paddle_customer_id text not null unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger paddle_customers_set_updated_at
  before update on public.paddle_customers
  for each row
  execute function public.set_updated_at();

alter table public.paddle_customers enable row level security;

create policy "paddle_customers_select_own" on public.paddle_customers
  for select
  using (auth.uid() = user_id);

grant select on table public.paddle_customers to authenticated;

-- Paddle 구독. status는 Paddle이 보내는 원본 문자열을 그대로 저장한다(active/trialing/
-- past_due/paused/canceled 등) — 앱에서 임의로 enum/check constraint로 제한하지 않는다.
-- Paddle이 값 체계를 바꾸거나 새 status를 추가해도 이 테이블 쓰기(웹훅)가 constraint
-- 위반으로 실패하지 않도록 하기 위함. Free/Pro 판정 같은 해석은 이 테이블을 읽는 쪽
-- (다음 단계의 접근 제어 헬퍼)에서 수행한다.
--
-- scheduled_change: Paddle Subscription 엔티티의 scheduled_change 필드를 그대로
-- jsonb로 저장한다 (예: {"action": "cancel", "effective_at": "...", "resume_at": null}).
-- action은 cancel/pause/resume 중 하나이고 예약된 변경이 없으면 전체가 null이다 —
-- 컬럼을 action/effective_at/resume_at으로 쪼개지 않고 Paddle이 보내는 구조를 그대로
-- 보존해, 세 필드 중 일부만 옮겨적다 놓치는 실수를 방지한다.
create table public.paddle_subscriptions (
  paddle_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  paddle_customer_id text not null references public.paddle_customers(paddle_customer_id),
  status text not null,
  price_id text not null,
  scheduled_change jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index paddle_subscriptions_user_id_idx on public.paddle_subscriptions (user_id);
create index paddle_subscriptions_paddle_customer_id_idx on public.paddle_subscriptions (paddle_customer_id);

create trigger paddle_subscriptions_set_updated_at
  before update on public.paddle_subscriptions
  for each row
  execute function public.set_updated_at();

alter table public.paddle_subscriptions enable row level security;

create policy "paddle_subscriptions_select_own" on public.paddle_subscriptions
  for select
  using (auth.uid() = user_id);

grant select on table public.paddle_subscriptions to authenticated;
