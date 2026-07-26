-- companies 테이블: 사용자별 지원 기업 데이터
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null check (status in ('진행 중', '내정', '입사', '불합격', '지원 취소')),
  current_step text not null,
  priority text not null check (priority in ('높음', '보통', '낮음')),
  next_schedule date,
  website_url text not null default '',
  mypage_url text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- user_id로 필터링하는 조회(RLS 포함)가 대부분이므로 인덱스 추가
create index if not exists companies_user_id_idx on public.companies (user_id);

-- UPDATE 시 updated_at을 always 현재 시각으로 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row
  execute function public.set_updated_at();

-- RLS 활성화: 로그인한 사용자는 자신의 행만 조회/추가/수정/삭제 가능
alter table public.companies enable row level security;

create policy "companies_select_own" on public.companies
  for select
  using (auth.uid() = user_id);

create policy "companies_insert_own" on public.companies
  for insert
  with check (auth.uid() = user_id);

create policy "companies_update_own" on public.companies
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "companies_delete_own" on public.companies
  for delete
  using (auth.uid() = user_id);
