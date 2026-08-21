-- 알림 읽음 상태 저장 테이블. 알림 "콘텐츠"는 이 테이블에 저장하지 않는다 — deadline/schedule
-- D-1/D-day 알림은 lib/notifications.ts가 이미 클라이언트에 로드되어 있는 events/companies/
-- application_steps로부터 매번 즉석 계산한다(계산형). 이 테이블은 그렇게 계산된 알림의
-- deterministic key(예: "deadline:{event.id}:{dateKey}:d1")에 대해 "읽었는지"만 기록한다 —
-- event_completions(0007, event_id 단위 체크 상태 저장)와 완전히 같은 목적/모양이다.
--
-- notification_key에 event.id뿐 아니라 dateKey(due_at/starts_at의 YYYY-MM-DD)까지 포함되므로,
-- 일정 날짜가 바뀌면 자동으로 새 key가 되어 이전 읽음 기록이 새 알림을 잘못 숨기지 않는다.
-- 이벤트가 삭제되면 그 key는 다시 계산되지 않으므로 이 테이블의 남은 row는 그냥 조회되지 않는
-- 고아 데이터가 될 뿐이라 별도 정리 로직이 필요 없다(cron 불필요).
create table public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, notification_key)
);

create index notification_reads_user_id_idx on public.notification_reads (user_id);

alter table public.notification_reads enable row level security;

create policy "notification_reads_select_own" on public.notification_reads
  for select using (auth.uid() = user_id);
create policy "notification_reads_insert_own" on public.notification_reads
  for insert with check (auth.uid() = user_id);

-- update/delete 정책은 두지 않는다 — 읽음 처리는 insert만으로 충분하고(다시 안 읽음으로
-- 되돌리는 UX가 v1 범위 밖), update 권한이 없으면 upsert(ignoreDuplicates: true)가 내부적으로
-- "INSERT ... ON CONFLICT DO NOTHING"으로 동작해 중복 insert가 조용히 무시된다(권한 오류 없음).
grant select, insert on table public.notification_reads to authenticated;
