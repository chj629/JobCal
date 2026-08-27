-- Paddle은 webhook 전달 순서를 보장하지 않는다. 같은 subscription의 과거 이벤트가 늦게
-- 도착해도 최신 status/scheduled_change 등을 되돌리지 못하도록 Paddle payload의
-- occurred_at을 행마다 보존하고, UPDATE 시 DB 안에서 원자적으로 비교한다.
--
-- 기존 행은 과거 Paddle occurred_at을 알 수 없으므로 NULL로 둔다. 서버 수신 시각이나
-- updated_at으로 임의 backfill하지 않는다. 배포 후 처음 받은 subscription 이벤트가 기준을
-- 세우고, 그 이후에는 더 최신인 occurred_at만 반영된다.
alter table public.paddle_subscriptions
  add column last_event_occurred_at timestamptz;

create or replace function public.prevent_stale_paddle_subscription_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- 같은 occurred_at은 동일 webhook 재전송으로 취급한다. 비교와 UPDATE가 같은 행 잠금
  -- 안에서 실행되므로 최신/과거 이벤트가 동시에 처리되어도 최종 상태는 항상 최신이다.
  if old.last_event_occurred_at is not null
     and (
       new.last_event_occurred_at is null
       or new.last_event_occurred_at <= old.last_event_occurred_at
     ) then
    return null;
  end if;

  return new;
end;
$$;

create trigger paddle_subscriptions_prevent_stale_event
  before update on public.paddle_subscriptions
  for each row
  execute function public.prevent_stale_paddle_subscription_event();
