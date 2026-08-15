-- next_actions 테이블: Company Detail "次のアクション" 카드의 자유 형식 할일 목록.
-- due_label은 현재 UI에서 표시/입력하지 않지만 기존 ActionItem 타입에 이미 있던 필드라
-- 스키마에도 그대로 남겨둔다(항상 빈 문자열).
create table if not exists public.next_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  text text not null default '',
  due_label text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists next_actions_company_id_idx on public.next_actions (company_id);

create trigger next_actions_set_updated_at
  before update on public.next_actions
  for each row
  execute function public.set_updated_at();

alter table public.next_actions enable row level security;

create policy "next_actions_select_own" on public.next_actions
  for select using (auth.uid() = user_id);
create policy "next_actions_insert_own" on public.next_actions
  for insert with check (auth.uid() = user_id);
create policy "next_actions_update_own" on public.next_actions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "next_actions_delete_own" on public.next_actions
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.next_actions
  to authenticated;
