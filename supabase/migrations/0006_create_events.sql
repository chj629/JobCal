-- events 테이블: 전형과 연결된 일정/마감/결과 발표 예정
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  application_step_id uuid not null references public.application_steps(id) on delete cascade,
  event_type text not null
    check (event_type in ('schedule', 'deadline', 'result_announcement')),
  title text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  due_at timestamptz,
  location text,
  online_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_company_id_idx on public.events (company_id);
create index if not exists events_application_step_id_idx on public.events (application_step_id);

create trigger events_set_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "events_select_own" on public.events
  for select using (auth.uid() = user_id);
create policy "events_insert_own" on public.events
  for insert with check (auth.uid() = user_id);
create policy "events_update_own" on public.events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "events_delete_own" on public.events
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.events
  to authenticated;

-- 기존 next_schedule/next_schedule_time을 "현재 전형"에 연결된 schedule 이벤트로 백필.
-- "현재 전형" 선택 규칙은 docs/database.md와 동일: step_order가 가장 앞선 미완료 전형,
-- 전부 완료된 경우에는 가장 마지막 전형.
insert into public.events (user_id, company_id, application_step_id, event_type, title, starts_at)
select
  c.user_id,
  c.id,
  step.id,
  'schedule',
  step.name,
  (c.next_schedule::text || ' ' || coalesce(c.next_schedule_time, '00:00'))::timestamptz
from public.companies c
join lateral (
  select aps.id, aps.name
  from public.application_steps aps
  where aps.company_id = c.id
  order by
    (aps.step_status = 'completed') asc,
    case when aps.step_status = 'completed' then -aps.step_order else aps.step_order end asc
  limit 1
) as step on true
where c.next_schedule is not null;

-- next_schedule/next_schedule_time은 원래 nullable이었으므로 별도 제약 변경은 필요 없다.
-- 컬럼 자체는 이후 정리 Phase에서 완전히 제거 예정이며, 앱은 더 이상 이 값을 쓰지 않는다.
