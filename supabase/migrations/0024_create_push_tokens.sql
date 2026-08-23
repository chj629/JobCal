-- push_tokens 테이블: 모바일 앱(jobcal-mobile)이 로그인 후 자신의 Expo Push Token을
-- 등록해두는 테이블. 이 마이그레이션은 토큰을 안전하게 저장하는 기반(1단계)만 만든다 —
-- 실제 push 발송/Cron/발송 dedup(push_notifications_sent)은 다음 단계에서 추가한다.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- user_id 단위가 아니라 토큰 값 자체에 unique를 둔다: Expo Push Token은 (앱 설치, 기기)
  -- 조합 하나에 대응하는 값이라, 같은 토큰이 동시에 두 사용자 소유일 수 없다. 앱이 같은
  -- 토큰으로 다시 등록하면(재실행, 권한 재확인 등) upsert(onConflict: expo_push_token)가
  -- 새 row를 만들지 않고 기존 row를 갱신해 중복을 막는다. 로그아웃 시 클라이언트가 현재
  -- 기기의 토큰 row를 삭제하므로(jobcal-mobile의 로그아웃 처리 참고), 같은 기기에서 다른
  -- 계정으로 로그인해도 이전 사용자의 row와 충돌하지 않는다.
  unique (expo_push_token)
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

create trigger push_tokens_set_updated_at
  before update on public.push_tokens
  for each row
  execute function public.set_updated_at();

alter table public.push_tokens enable row level security;

-- 로그인한 사용자는 자신의 토큰만 조회/등록/갱신/삭제할 수 있다. service role은 RLS를
-- 우회하므로(다음 단계의 발송 Cron이 전체 사용자 토큰을 읽는 데 사용) 여기에는 별도
-- service role 정책/키를 두지 않는다 — 클라이언트(모바일 앱)는 항상 이 4개 정책 범위
-- 안에서만 자기 자신의 토큰을 다룬다.
create policy "push_tokens_select_own" on public.push_tokens
  for select using (auth.uid() = user_id);
create policy "push_tokens_insert_own" on public.push_tokens
  for insert with check (auth.uid() = user_id);
create policy "push_tokens_update_own" on public.push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_tokens_delete_own" on public.push_tokens
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete
  on table public.push_tokens
  to authenticated;
