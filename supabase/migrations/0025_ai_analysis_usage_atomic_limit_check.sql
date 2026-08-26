-- ai_analysis_usage(0016)의 increment_ai_analysis_usage()를 "사용량 확인 + 조건부 증가"가
-- 한 트랜잭션 안에서 처리되도록 교체한다. 기존에는 이 함수가 항상 오늘 행을 무조건 +1
-- 하고, 그 뒤 app/api/ai/analyze-email/route.ts가 별도로 합계를 조회해 한도 초과 여부를
-- 판단했다 — 그래서 한도를 넘긴 뒤의 재요청도 계속 call_count를 증가시켰다(차단은
-- 정확했지만 카운터 값 자체가 "성공+차단 시도"를 합친 값이 되어 있었다).
--
-- 이 함수는 "합계 확인"과 "증가"를 한 함수(=한 트랜잭션) 안에서 처리해, 한도를 넘긴
-- 요청은 증가 자체를 하지 않는다. p_scope('lifetime'|'month')/p_limit은 Free/Pro 판정과
-- 한도값 자체는 여전히 route.ts(getUserPlan 기반)가 결정해서 넘겨준다 — 이 함수는 Paddle이나
-- 플랜 판정과 무관하게 "주어진 scope/limit 안에서 증가 가능한지"만 안다.
--
-- 동시 요청 안전성: 사용자별로 pg_advisory_xact_lock을 걸어 같은 사용자의 동시 호출을
-- 직렬화한다. 트랜잭션 스코프 잠금이라 커밋/롤백 시 자동 해제되며, PostgREST가 RPC
-- 호출 1건을 트랜잭션 1개로 실행하므로 PgBouncer 트랜잭션 풀링 모드에서도 안전하다
-- (세션 스코프인 pg_advisory_lock은 커넥션이 풀로 반환된 뒤 다른 요청이 그 커넥션을
-- 재사용하면 잠금이 해제되지 않을 위험이 있어 쓰지 않는다). 오늘 행이 아직 없는
-- "이 사용자의 오늘 첫 호출" 상황도 advisory lock은 실제 행 존재 여부와 무관하게
-- 걸리므로, 행 단위 잠금(SELECT ... FOR UPDATE)과 달리 그 경계에서 새로 레이스가
-- 생기지 않는다.
drop function if exists public.increment_ai_analysis_usage(date);

create or replace function public.increment_ai_analysis_usage(
  p_usage_date date,
  p_scope text,
  p_limit integer
)
returns table(allowed boolean, usage_count integer, usage_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_total integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  if p_scope = 'month' then
    select coalesce(sum(call_count), 0) into current_total
    from public.ai_analysis_usage
    where user_id = auth.uid()
      and usage_date >= date_trunc('month', p_usage_date)::date;
  else
    select coalesce(sum(call_count), 0) into current_total
    from public.ai_analysis_usage
    where user_id = auth.uid();
  end if;

  if current_total >= p_limit then
    return query select false, current_total, p_limit;
    return;
  end if;

  insert into public.ai_analysis_usage (user_id, usage_date, call_count)
  values (auth.uid(), p_usage_date, 1)
  on conflict (user_id, usage_date)
  do update set call_count = public.ai_analysis_usage.call_count + 1;

  return query select true, current_total + 1, p_limit;
end;
$$;

grant execute on function public.increment_ai_analysis_usage(date, text, integer) to authenticated;
