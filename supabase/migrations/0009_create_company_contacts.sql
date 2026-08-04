-- company_contacts 테이블: 기업별 담당자 정보(선택 입력, 여러 명 등록 가능)
create table if not exists public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  role text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_contacts_company_id_idx on public.company_contacts (company_id);

create trigger company_contacts_set_updated_at
  before update on public.company_contacts
  for each row
  execute function public.set_updated_at();

alter table public.company_contacts enable row level security;

create policy "company_contacts_select_own" on public.company_contacts
  for select using (auth.uid() = user_id);
create policy "company_contacts_insert_own" on public.company_contacts
  for insert with check (auth.uid() = user_id);
create policy "company_contacts_update_own" on public.company_contacts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "company_contacts_delete_own" on public.company_contacts
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.company_contacts
  to authenticated;
