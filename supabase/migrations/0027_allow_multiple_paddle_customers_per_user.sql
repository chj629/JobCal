-- 재구독 Checkout은 기존 Paddle customer id를 재사용하지만, Paddle에서 예상과 달리 새
-- customer id가 발급되는 경우도 webhook이 결제 정보를 잃지 않고 저장할 수 있어야 한다.
-- 기존 구조는 user_id가 PK라 사용자당 customer 행이 하나뿐이었고, 새 id를 upsert하면
-- paddle_subscriptions/paddle_transactions가 참조 중인 paddle_customer_id를 UPDATE하려다
-- FK 위반이 발생했다.
--
-- customer id는 Paddle에서 실제 결제 주체를 식별하는 값이므로 과거 행의 id를 새 id로
-- 덮어쓰거나 ON UPDATE CASCADE로 바꾸지 않는다. 대신 (user_id, paddle_customer_id)를
-- 매핑 PK로 삼아 한 JobCal 사용자가 예외적으로 여러 Paddle customer id를 가질 수 있게
-- 한다. 기존 paddle_customer_id UNIQUE는 그대로 유지되어 하나의 Paddle customer가 서로
-- 다른 JobCal 사용자에게 중복 연결되는 것도 계속 막는다. 기존 행과 이를 참조하는
-- subscription/transaction/adjustment 데이터는 수정하거나 삭제하지 않는다.
alter table public.paddle_customers
  drop constraint paddle_customers_pkey;

alter table public.paddle_customers
  add constraint paddle_customers_pkey primary key (user_id, paddle_customer_id);
