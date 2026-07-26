-- application_steps 테이블: 기업별 전형 단계와 진행 상태
create table if not exists public.application_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  step_order integer not null,
  step_status text not null default 'waiting'
    check (step_status in ('waiting', 'action_required', 'scheduled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists application_steps_company_id_idx on public.application_steps (company_id);

create trigger application_steps_set_updated_at
  before update on public.application_steps
  for each row
  execute function public.set_updated_at();

alter table public.application_steps enable row level security;

create policy "application_steps_select_own" on public.application_steps
  for select using (auth.uid() = user_id);
create policy "application_steps_insert_own" on public.application_steps
  for insert with check (auth.uid() = user_id);
create policy "application_steps_update_own" on public.application_steps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "application_steps_delete_own" on public.application_steps
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.application_steps
  to authenticated;

-- 기업 생성 시 기본 8개 전형을 자동 생성하는 트리거 (앞으로 생성되는 기업에 적용)
create or replace function public.create_default_application_steps()
returns trigger
language plpgsql
as $$
begin
  insert into public.application_steps (user_id, company_id, name, step_order, step_status)
  values
    (new.user_id, new.id, '엔트리', 1, 'waiting'),
    (new.user_id, new.id, '설명회', 2, 'waiting'),
    (new.user_id, new.id, 'ES', 3, 'waiting'),
    (new.user_id, new.id, 'Web 테스트', 4, 'waiting'),
    (new.user_id, new.id, '코딩 테스트', 5, 'waiting'),
    (new.user_id, new.id, '1차 면접', 6, 'waiting'),
    (new.user_id, new.id, '2차 면접', 7, 'waiting'),
    (new.user_id, new.id, '최종 면접', 8, 'waiting');
  return new;
end;
$$;

create trigger companies_create_default_steps
  after insert on public.companies
  for each row
  execute function public.create_default_application_steps();

-- 이미 존재하는 기업(트리거 적용 전 생성)의 기본 전형 백필.
-- 기존 current_step보다 앞선 전형은 completed, 일치하는 전형은 action_required, 이후는 waiting.
-- current_step이 8개 밖의 값(내정/입사 등)이면 전체 completed로 간주한다.
insert into public.application_steps (user_id, company_id, name, step_order, step_status)
select
  c.user_id, c.id, s.name, s.step_order,
  case
    when c.current_step is null then 'waiting'
    when not exists (
      select 1 from (values ('엔트리',1),('설명회',2),('ES',3),('Web 테스트',4),
        ('코딩 테스트',5),('1차 면접',6),('2차 면접',7),('최종 면접',8)) as t(name, step_order)
      where t.name = c.current_step
    ) then 'completed'
    when s.step_order < (
      select t.step_order from (values ('엔트리',1),('설명회',2),('ES',3),('Web 테스트',4),
        ('코딩 테스트',5),('1차 면접',6),('2차 면접',7),('최종 면접',8)) as t(name, step_order)
      where t.name = c.current_step
    ) then 'completed'
    when s.name = c.current_step then 'action_required'
    else 'waiting'
  end
from public.companies c
cross join (values ('엔트리',1),('설명회',2),('ES',3),('Web 테스트',4),
  ('코딩 테스트',5),('1차 면접',6),('2차 면접',7),('최종 면접',8)) as s(name, step_order)
where not exists (select 1 from public.application_steps existing where existing.company_id = c.id);

-- current_step은 더 이상 앱에서 채우지 않는다. 기존 값은 보존하되 NOT NULL만 해제한다.
-- (컬럼 자체는 이후 정리 Phase에서 완전히 제거 예정)
alter table public.companies
  alter column current_step drop not null;
