-- company_notes 테이블: 기업별 자유 메모(제목 + 내용, 여러 개 등록 가능)
create table if not exists public.company_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_notes_company_id_idx on public.company_notes (company_id);

create trigger company_notes_set_updated_at
  before update on public.company_notes
  for each row
  execute function public.set_updated_at();

alter table public.company_notes enable row level security;

create policy "company_notes_select_own" on public.company_notes
  for select using (auth.uid() = user_id);
create policy "company_notes_insert_own" on public.company_notes
  for insert with check (auth.uid() = user_id);
create policy "company_notes_update_own" on public.company_notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "company_notes_delete_own" on public.company_notes
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.company_notes
  to authenticated;

-- 기존 companies.memo를 company_notes로 백필 (기업당 최대 1건, position = 0)
insert into public.company_notes (user_id, company_id, title, content, position)
select user_id, id, '', memo, 0
from public.companies
where memo is not null and memo <> '';

-- memo는 더 이상 앱에서 채우지 않는다. 컬럼 자체는 이후 정리 Phase에서 완전히 제거 예정.
