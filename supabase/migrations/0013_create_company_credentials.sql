-- company_credentials 테이블: docs/database.md에 설계된 마이페이지 로그인 정보.
-- 기업당 최대 1건이라 company_id에 unique 제약을 둔다.
-- encrypted_password는 스키마만 미리 만들어두고, 암호화 방식이 확정되기 전까지 앱에서
-- 채우지 않는다(비밀번호 평문 저장 금지).
create table if not exists public.company_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  login_url text,
  login_id text,
  encrypted_password text,
  login_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);

create index if not exists company_credentials_company_id_idx on public.company_credentials (company_id);

create trigger company_credentials_set_updated_at
  before update on public.company_credentials
  for each row
  execute function public.set_updated_at();

alter table public.company_credentials enable row level security;

create policy "company_credentials_select_own" on public.company_credentials
  for select using (auth.uid() = user_id);
create policy "company_credentials_insert_own" on public.company_credentials
  for insert with check (auth.uid() = user_id);
create policy "company_credentials_update_own" on public.company_credentials
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "company_credentials_delete_own" on public.company_credentials
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.company_credentials
  to authenticated;
