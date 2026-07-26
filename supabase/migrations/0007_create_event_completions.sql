-- "오늘 해야 할 일" 체크 상태 저장 테이블 (이벤트 단위).
-- 기존 task_completions(기업+날짜 단위)는 의미가 달라져 더 이상 사용하지 않지만,
-- 과거 체크 기록을 새 이벤트에 신뢰성 있게 매핑할 방법이 없어 삭제하지 않고 그대로 둔다.
create table if not exists public.event_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists event_completions_user_id_idx on public.event_completions (user_id);

alter table public.event_completions enable row level security;

create policy "event_completions_select_own" on public.event_completions
  for select using (auth.uid() = user_id);
create policy "event_completions_insert_own" on public.event_completions
  for insert with check (auth.uid() = user_id);
create policy "event_completions_delete_own" on public.event_completions
  for delete using (auth.uid() = user_id);

grant select, insert, delete
  on table public.event_completions
  to authenticated;
