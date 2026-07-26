-- Dashboard "오늘 해야 할 일" 체크 상태 저장 테이블.
-- 작업 목록 자체는 companies의 next_schedule/next_schedule_time에서 매번 계산하고,
-- 이 테이블에는 "어떤 기업의 어떤 날짜 일정을 완료 처리했는지"만 기록한다.
-- (companies 테이블에는 완료 여부 컬럼을 추가하지 않는다.)
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  schedule_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, company_id, schedule_date)
);

create index if not exists task_completions_user_id_idx on public.task_completions (user_id);

alter table public.task_completions enable row level security;

create policy "task_completions_select_own" on public.task_completions
  for select
  using (auth.uid() = user_id);

create policy "task_completions_insert_own" on public.task_completions
  for insert
  with check (auth.uid() = user_id);

create policy "task_completions_delete_own" on public.task_completions
  for delete
  using (auth.uid() = user_id);

-- RLS 정책만으로는 부족하다. authenticated role에 테이블 권한 자체가 없으면
-- "permission denied for table task_completions" 오류가 발생한다.
grant select, insert, delete
  on table public.task_completions
  to authenticated;
