-- 공개 문의 API의 기존 메모리 Map rate limit은 Vercel serverless 인스턴스마다 분리되고
-- 재시작 시 사라졌다. HMAC-SHA256으로 만든 IP/email 식별키만 짧게 보관하고, 두 제한의
-- 확인과 허용된 요청의 증가를 한 RPC transaction에서 처리한다. 문의 내용이나 이름,
-- IP/email 원문은 이 테이블에 저장하지 않는다.

create table public.contact_rate_limits (
  key_hash text primary key,
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  constraint contact_rate_limits_key_hash_format check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint contact_rate_limits_valid_window check (expires_at > window_started_at)
);

create index contact_rate_limits_expires_at_idx
  on public.contact_rate_limits (expires_at);

-- 브라우저가 카운터를 읽거나 조작할 이유가 없다. service_role도 테이블을 직접 쓰지 않고
-- 아래 SECURITY DEFINER 함수만 호출한다.
alter table public.contact_rate_limits enable row level security;
revoke all on table public.contact_rate_limits from public, anon, authenticated;

create or replace function public.check_contact_rate_limit_atomic(
  p_ip_key text,
  p_email_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_time timestamptz := clock_timestamp();
  ordered_keys text[];
  current_key text;
  current_count integer;
  current_expiry timestamptz;
  is_allowed boolean := true;
  cleanup_key text;
begin
  -- 함수가 service_role 전용이어도 잘못된 서버 호출로 비정상 행/무제한 윈도우가 만들어지지
  -- 않도록 입력 형식과 운영 가능한 범위를 함수 내부에서 다시 제한한다.
  if p_ip_key is null or p_ip_key !~ '^[0-9a-f]{64}$'
    or p_email_key is null or p_email_key !~ '^[0-9a-f]{64}$'
    or p_ip_key = p_email_key then
    raise exception 'invalid_contact_rate_limit_key';
  end if;

  if p_max_requests is null or p_max_requests < 1 or p_max_requests > 100 then
    raise exception 'invalid_contact_rate_limit_max_requests';
  end if;

  if p_window_seconds is null or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'invalid_contact_rate_limit_window';
  end if;

  select array_agg(candidate_key order by candidate_key)
    into ordered_keys
  from unnest(array[p_ip_key, p_email_key]) as keys(candidate_key);

  -- 두 요청이 IP/email 키를 반대 조합으로 공유해도 교착하지 않도록 항상 hash 문자열
  -- 오름차순으로 transaction advisory lock을 획득한다. 같은 키의 serverless 동시 요청은
  -- 여기서 직렬화되며 commit/rollback 때 잠금이 자동 해제된다.
  foreach current_key in array ordered_keys loop
    perform pg_advisory_xact_lock(hashtextextended(current_key, 0));
  end loop;

  -- 판정 단계에서는 행을 만들지 않는다. 이미 IP 한도에 걸린 공격자가 매 요청마다 다른
  -- email을 보내도 count=0인 email 행을 대량 생성할 수 없게, 두 키가 모두 허용된 뒤에만
  -- 아래에서 insert/upsert한다.
  foreach current_key in array ordered_keys loop
    select limits.request_count, limits.expires_at
      into current_count, current_expiry
    from public.contact_rate_limits as limits
    where limits.key_hash = current_key;

    -- 만료된 행은 이번 판정에서 0회로 본다. IP/email 중 하나라도 아직 유효한 윈도우에서
    -- 한도에 도달했다면 어느 카운터도 증가시키지 않는다.
    if found and current_expiry > request_time and current_count >= p_max_requests then
      is_allowed := false;
    end if;
  end loop;

  if is_allowed then
    foreach current_key in array ordered_keys loop
      insert into public.contact_rate_limits as limits (
        key_hash,
        request_count,
        window_started_at,
        expires_at
      )
      values (
        current_key,
        1,
        request_time,
        request_time + make_interval(secs => p_window_seconds)
      )
      on conflict (key_hash) do update
      set request_count = case
            when limits.expires_at <= request_time then 1
            else limits.request_count + 1
          end,
          window_started_at = case
            when limits.expires_at <= request_time then request_time
            else limits.window_started_at
          end,
          expires_at = case
            when limits.expires_at <= request_time
              then request_time + make_interval(secs => p_window_seconds)
            else limits.expires_at
          end;
    end loop;
  end if;

  -- 매 호출에서 만료 행 전체를 지우지 않는다. expires_at index로 오래된 후보를 최대 20개만
  -- 보고, 해당 키 advisory lock을 즉시 얻을 수 있을 때만 삭제한다. 다른 요청이 그 키를
  -- 처리 중이면 기다리지 않고 건너뛰므로 현재 판정 경로를 오래 막거나 race를 만들지 않는다.
  for cleanup_key in
    select limits.key_hash
    from public.contact_rate_limits as limits
    where limits.expires_at <= request_time
      and not (limits.key_hash = any (ordered_keys))
    order by limits.expires_at
    limit 20
  loop
    if pg_try_advisory_xact_lock(hashtextextended(cleanup_key, 0)) then
      delete from public.contact_rate_limits as limits
      where limits.key_hash = cleanup_key
        and limits.expires_at <= request_time;
    end if;
  end loop;

  return is_allowed;
end;
$$;

-- CREATE FUNCTION의 기본 PUBLIC execute 권한을 명시적으로 제거하고, 서버 전용
-- service_role만 PostgREST RPC를 호출할 수 있게 한다.
revoke execute on function public.check_contact_rate_limit_atomic(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_contact_rate_limit_atomic(text, text, integer, integer)
  to service_role;
