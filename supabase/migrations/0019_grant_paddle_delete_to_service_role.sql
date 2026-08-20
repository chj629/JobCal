-- 0018에서는 "웹훅 코드가 이 두 테이블에서 delete를 쓰지 않는다"는 이유로 service_role에
-- delete를 grant하지 않았다. 하지만 STEP 2 Simulator 테스트로 만든 가짜 행(paddle_customers/
-- paddle_subscriptions)을 정리하는 것처럼, 웹훅이 아니라 운영자가 service role key로 직접
-- 수행하는 1회성 데이터 정정 작업에는 delete가 필요하다. app/api/paddle/webhook 코드 자체는
-- 여전히 select/insert/update만 사용하며 이 grant로 동작이 달라지지 않는다.
grant delete on table public.paddle_customers to service_role;
grant delete on table public.paddle_subscriptions to service_role;
