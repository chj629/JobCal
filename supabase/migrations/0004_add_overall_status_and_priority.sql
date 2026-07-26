-- overall_status 추가 + 기존 status 값을 영문 slug로 백필
alter table public.companies
  add column if not exists overall_status text;

update public.companies
set overall_status = case status
  when '진행 중' then 'in_progress'
  when '내정' then 'offer'
  when '입사' then 'joined'
  when '불합격' then 'rejected'
  when '지원 취소' then 'cancelled'
end
where overall_status is null;

alter table public.companies
  alter column overall_status set not null;

alter table public.companies
  add constraint companies_overall_status_check
  check (overall_status in ('in_progress', 'offer', 'joined', 'rejected', 'cancelled'));

-- 이전 status 컬럼은 더 이상 앱에서 채우지 않는다. 기존 값은 보존하되 NOT NULL만 해제한다.
-- (컬럼 자체는 이후 정리 Phase에서 완전히 제거 예정)
alter table public.companies
  alter column status drop not null;

-- priority는 컬럼명을 유지한 채 값만 영문 slug로 변환한다.
alter table public.companies
  drop constraint if exists companies_priority_check;

update public.companies
set priority = case priority
  when '높음' then 'high'
  when '보통' then 'medium'
  when '낮음' then 'low'
  else priority
end;

alter table public.companies
  add constraint companies_priority_check
  check (priority in ('high', 'medium', 'low'));
