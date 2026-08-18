-- ai_analysis_usage 테이블: OpenAI 비용 남용 방지를 위한 사용자별 일일 AI 메일 분석
-- 호출 횟수 기록. app/api/ai/analyze-email/route.ts가 OpenAI 호출 전에 이 테이블을
-- 확인/증가시켜 하루 호출 횟수를 제한한다.
create table if not exists public.ai_analysis_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  call_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create index if not exists ai_analysis_usage_user_id_idx on public.ai_analysis_usage (user_id);

create trigger ai_analysis_usage_set_updated_at
  before update on public.ai_analysis_usage
  for each row
  execute function public.set_updated_at();

alter table public.ai_analysis_usage enable row level security;

-- 자신의 사용량만 조회 가능(추후 "오늘 N/20회 사용" 같은 UI에 쓸 수 있도록 select만 열어둔다).
-- insert/update는 아래 increment_ai_analysis_usage 함수(SECURITY DEFINER)를 통해서만
-- 이뤄지며, 클라이언트가 테이블에 직접 써서 자신의 카운트를 리셋하거나 다른 사용자 행을
-- 건드릴 수 없도록 RLS에는 select 정책만 둔다.
create policy "ai_analysis_usage_select_own" on public.ai_analysis_usage
  for select
  using (auth.uid() = user_id);

grant select on table public.ai_analysis_usage to authenticated;

-- 현재 로그인한 사용자(auth.uid())의 특정 날짜 호출 횟수를 원자적으로 1 증가시키고 새
-- 횟수를 반환한다. user_id를 파라미터로 받지 않고 항상 auth.uid()로만 판정해서, 이 함수가
-- PostgREST RPC로 클라이언트에 노출되어 직접 호출되더라도 호출자 자신의 행만 변경할 수
-- 있다 — 다른 사용자의 카운트를 조작하는 것은 불가능하다. "20회 초과 시 차단" 판정 자체는
-- 이 함수가 아니라 app/api/ai/analyze-email/route.ts가 반환된 횟수를 보고 OpenAI 호출
-- 여부를 결정하는 방식으로, 서버(Route Handler)에서만 이뤄진다.
create or replace function public.increment_ai_analysis_usage(p_usage_date date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.ai_analysis_usage (user_id, usage_date, call_count)
  values (auth.uid(), p_usage_date, 1)
  on conflict (user_id, usage_date)
  do update set call_count = public.ai_analysis_usage.call_count + 1
  returning call_count into new_count;

  return new_count;
end;
$$;

grant execute on function public.increment_ai_analysis_usage(date) to authenticated;
