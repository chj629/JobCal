-- service_role은 Postgres BYPASSRLS 속성으로 RLS 정책은 우회하지만, 그것과 별개로
-- 테이블에 대한 기본 SQL GRANT는 없으면 여전히 접근이 막힌다("permission denied for
-- table ..."). 0017에서 paddle_customers/paddle_subscriptions에는 authenticated에게만
-- select를 grant했고 service_role에는 아무 grant도 없었다 — 이 프로젝트의 다른 테이블
-- (companies 등)도 동일하게 service_role grant가 없지만, 지금까지 service_role은
-- auth.admin.deleteUser() 같은 Auth Admin API로만 쓰여 테이블 직접 접근이 필요 없었을
-- 뿐이다. app/api/paddle/webhook은 lib/supabase/admin.ts(service role, PostgREST
-- 경유)로 이 두 테이블에 upsert해야 하므로 여기서만 명시적으로 권한을 추가한다.
--
-- delete는 grant하지 않는다 — 웹훅은 이 테이블에서 행을 삭제하지 않고, 삭제는 오직
-- auth.users 삭제 시 on delete cascade로만 일어난다(0017 FK 정의).
grant select, insert, update on table public.paddle_customers to service_role;
grant select, insert, update on table public.paddle_subscriptions to service_role;
