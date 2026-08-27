-- application_steps의 상태 전이와 현재 전형 삭제는 각각 여러 PostgREST 요청으로 나뉘어
-- 있었다. 요청 사이에 오류가 나거나 같은 기업을 두 탭에서 동시에 수정하면 in_progress가
-- 0개/2개가 되거나, 삭제만 되고 다음 waiting 승격은 빠지는 부분 상태가 남을 수 있었다.
-- 두 복합 동작을 각각 한 RPC(=한 DB transaction)로 묶고, companies 행을 FOR UPDATE로
-- 잠가 같은 기업의 동시 호출만 직렬화한다. 서로 다른 기업 행은 서로 막지 않는다.

create or replace function public.update_application_step_status_atomic(
  p_step_id uuid,
  p_status text
)
returns table(
  result_step_id uuid,
  result_step_status text,
  cleared_in_progress_ids uuid[],
  promoted_step_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  target_company_id uuid;
  target_step_order integer;
  target_previous_status text;
  current_step_order integer;
  all_steps_passed boolean;
  cleared_ids uuid[] := '{}'::uuid[];
  next_waiting_id uuid;
  affected_rows integer;
begin
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_status not in ('waiting', 'in_progress', 'passed', 'failed') then
    raise exception 'invalid_application_step_status';
  end if;

  -- 잠글 company id를 먼저 찾되, SECURITY DEFINER가 RLS를 우회하므로 소유권을 명시한다.
  select s.company_id
    into target_company_id
  from public.application_steps as s
  where s.id = p_step_id
    and s.user_id = caller_id;

  if target_company_id is null then
    raise exception 'application_step_not_found';
  end if;

  -- 이 행 잠금이 같은 company의 상태 전이/삭제 RPC를 직렬화한다. 다른 company는 독립적이다.
  perform 1
  from public.companies as c
  where c.id = target_company_id
    and c.user_id = caller_id
  for update;

  if not found then
    raise exception 'application_step_not_found';
  end if;

  -- company lock을 기다리는 사이 대상이 바뀌었을 수 있으므로 잠금 획득 후 다시 읽는다.
  select s.step_order, s.step_status
    into target_step_order, target_previous_status
  from public.application_steps as s
  where s.id = p_step_id
    and s.company_id = target_company_id
    and s.user_id = caller_id
  for update;

  if not found then
    raise exception 'application_step_not_found';
  end if;

  -- 기존 updateStepStatus의 미래 waiting 차단 규칙을 그대로 서버 안에서 판정한다.
  if p_status in ('passed', 'failed') and target_previous_status = 'waiting' then
    select min(s.step_order)
      into current_step_order
    from public.application_steps as s
    where s.company_id = target_company_id
      and s.step_status = 'in_progress';

    if current_step_order is null then
      select min(s.step_order)
        into current_step_order
      from public.application_steps as s
      where s.company_id = target_company_id
        and s.step_status = 'failed';
    end if;

    if current_step_order is null then
      select bool_and(s.step_status = 'passed'), max(s.step_order)
        into all_steps_passed, current_step_order
      from public.application_steps as s
      where s.company_id = target_company_id;

      if not coalesce(all_steps_passed, false) then
        current_step_order := null;
      end if;
    end if;

    if current_step_order is not null and target_step_order > current_step_order then
      raise exception 'future_waiting_step_status_blocked';
    end if;
  end if;

  -- 다른 현재 전형 정리와 대상 변경이 같은 transaction 안에서 성공하거나 함께 rollback된다.
  if p_status = 'in_progress' then
    with cleared as (
      update public.application_steps as s
      set step_status = 'waiting'
      where s.company_id = target_company_id
        and s.user_id = caller_id
        and s.step_status = 'in_progress'
        and s.id <> p_step_id
      returning s.id
    )
    select coalesce(array_agg(cleared.id), '{}'::uuid[])
      into cleared_ids
    from cleared;
  end if;

  update public.application_steps as s
  set step_status = p_status
  where s.id = p_step_id
    and s.company_id = target_company_id
    and s.user_id = caller_id;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'application_step_not_found';
  end if;

  -- 기존 규칙: 변경 전 현재 전형이 passed가 된 경우에만 뒤쪽의 가장 가까운 waiting을 승격.
  -- 과거의 비정상 데이터에 다른 in_progress가 이미 남아 있다면 새로 하나를 더 만들지 않는다.
  if p_status = 'passed'
     and target_previous_status = 'in_progress'
     and not exists (
       select 1
       from public.application_steps as s
       where s.company_id = target_company_id
         and s.step_status = 'in_progress'
     ) then
    select s.id
      into next_waiting_id
    from public.application_steps as s
    where s.company_id = target_company_id
      and s.step_order > target_step_order
      and s.step_status = 'waiting'
    order by s.step_order asc, s.id asc
    limit 1
    for update;

    if next_waiting_id is not null then
      update public.application_steps as s
      set step_status = 'in_progress'
      where s.id = next_waiting_id;
    end if;
  end if;

  return query
  select p_step_id, p_status, cleared_ids, next_waiting_id;
end;
$$;

create or replace function public.delete_application_step_atomic(
  p_step_id uuid
)
returns table(
  deleted_step_id uuid,
  promoted_step_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  target_company_id uuid;
  target_step_order integer;
  target_step_status text;
  next_waiting_id uuid;
  affected_rows integer;
begin
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select s.company_id
    into target_company_id
  from public.application_steps as s
  where s.id = p_step_id
    and s.user_id = caller_id;

  if target_company_id is null then
    raise exception 'application_step_not_found';
  end if;

  perform 1
  from public.companies as c
  where c.id = target_company_id
    and c.user_id = caller_id
  for update;

  if not found then
    raise exception 'application_step_not_found';
  end if;

  select s.step_order, s.step_status
    into target_step_order, target_step_status
  from public.application_steps as s
  where s.id = p_step_id
    and s.company_id = target_company_id
    and s.user_id = caller_id
  for update;

  if not found then
    raise exception 'application_step_not_found';
  end if;

  delete from public.application_steps as s
  where s.id = p_step_id
    and s.company_id = target_company_id
    and s.user_id = caller_id;

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception 'application_step_not_found';
  end if;

  -- 기존 규칙: 삭제 대상이 현재 전형일 때만 뒤쪽의 가장 가까운 waiting을 승격한다.
  -- 삭제와 events ON DELETE CASCADE, 승격은 모두 이 transaction 안에서 처리된다.
  if target_step_status = 'in_progress'
     and not exists (
       select 1
       from public.application_steps as s
       where s.company_id = target_company_id
         and s.step_status = 'in_progress'
     ) then
    select s.id
      into next_waiting_id
    from public.application_steps as s
    where s.company_id = target_company_id
      and s.step_order > target_step_order
      and s.step_status = 'waiting'
    order by s.step_order asc, s.id asc
    limit 1
    for update;

    if next_waiting_id is not null then
      update public.application_steps as s
      set step_status = 'in_progress'
      where s.id = next_waiting_id;
    end if;
  end if;

  return query
  select p_step_id, next_waiting_id;
end;
$$;

-- SECURITY DEFINER 함수는 로그인 사용자에게만 노출하고, 함수 내부에서도 auth.uid()와
-- company/step user_id를 모두 확인한다.
revoke execute on function public.update_application_step_status_atomic(uuid, text) from public;
revoke execute on function public.delete_application_step_atomic(uuid) from public;
grant execute on function public.update_application_step_status_atomic(uuid, text) to authenticated;
grant execute on function public.delete_application_step_atomic(uuid) to authenticated;
