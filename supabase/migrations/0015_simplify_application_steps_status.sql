-- application_steps.step_status를 waiting/in_progress/passed/failed 4개로 단순화한다.
-- 기존 값(waiting/action_required/scheduled/completed)은 이 마이그레이션에서 완전히 대체된다.
-- 이 단계에서는 상태값과 기본 전형 생성 방식만 바꾸고, "통과 시 다음 전형 자동 승격 /
-- 되돌릴 때 뒤 단계 정리" 같은 캐스케이드 로직은 아직 적용하지 않는다(다음 단계에서 구현).

-- 1) 기존 check constraint 제거 (0005에서 이름 없이 생성된 제약을 pg_constraint에서 찾아 제거)
do $$
declare
  target_constraint text;
begin
  select conname into target_constraint
  from pg_constraint
  where conrelid = 'public.application_steps'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%step_status%';

  if target_constraint is not null then
    execute format('alter table public.application_steps drop constraint %I', target_constraint);
  end if;
end $$;

-- 2) 기존 데이터 변환.
-- "현재 전형" 계산은 기존 getCurrentStep()과 동일한 규칙을 그대로 따른다: step_order가
-- 가장 앞서면서 completed가 아닌 전형, 전부 completed였다면 가장 마지막 전형.
--   - 현재 전형보다 앞선 전형(= 기존에 completed였던 전형) -> passed
--   - 현재 전형 -> in_progress
--   - 현재 전형보다 뒤 -> waiting
-- overall_status가 rejected인 기업도 동일한 규칙을 그대로 적용한다(어느 전형에서 정확히
-- 떨어졌는지는 기존 데이터만으로 확정할 수 없어, 여기서 자동으로 failed를 만들지 않는다).
-- 마이그레이션 적용 후 아래 쿼리로 rejected 기업들을 별도로 확인한다:
--
--   select
--     c.id as company_id,
--     c.name as company_name,
--     s.name as ambiguous_step_name,
--     s.step_order as ambiguous_step_order
--   from public.companies c
--   left join public.application_steps s
--     on s.company_id = c.id and s.step_status = 'in_progress'
--   where c.overall_status = 'rejected'
--   order by c.name;
--
with current_orders as (
  select
    company_id,
    coalesce(
      min(step_order) filter (where step_status <> 'completed'),
      max(step_order)
    ) as current_order
  from public.application_steps
  group by company_id
)
update public.application_steps as steps
set step_status = case
  when steps.step_order < co.current_order then 'passed'
  when steps.step_order = co.current_order then 'in_progress'
  else 'waiting'
end
from current_orders co
where co.company_id = steps.company_id;

-- 3) 새 check constraint 추가
alter table public.application_steps
  add constraint application_steps_step_status_check
  check (step_status in ('waiting', 'in_progress', 'passed', 'failed'));

-- 4) 기본 전형 생성 트리거: 1번 전형(엔트리)만 in_progress로 시작하고 나머지는 waiting.
create or replace function public.create_default_application_steps()
returns trigger
language plpgsql
as $$
begin
  insert into public.application_steps (user_id, company_id, name, step_order, step_status, step_key)
  values
    (new.user_id, new.id, '엔트리', 1, 'in_progress', 'entry'),
    (new.user_id, new.id, '설명회', 2, 'waiting', 'briefing'),
    (new.user_id, new.id, 'ES', 3, 'waiting', 'es'),
    (new.user_id, new.id, 'Web 테스트', 4, 'waiting', 'web_test'),
    (new.user_id, new.id, '코딩 테스트', 5, 'waiting', 'coding_test'),
    (new.user_id, new.id, '1차 면접', 6, 'waiting', 'interview_1'),
    (new.user_id, new.id, '2차 면접', 7, 'waiting', 'interview_2'),
    (new.user_id, new.id, '최종 면접', 8, 'waiting', 'interview_final');
  return new;
end;
$$;
