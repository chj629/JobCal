import {
  EventName,
  type EventEntity,
  type SubscriptionCreatedNotification,
  type SubscriptionNotification,
  type TransactionNotification,
} from "@paddle/paddle-node-sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const FOREIGN_KEY_VIOLATION = "23503";

// subscription.created/updated/canceled + transaction.completed 4개 이벤트만 처리한다.
// 그 외 이벤트는 구독 설정을 하지 않았다면 애초에 안 오지만, 혹시 오더라도 no-op으로
// 무시한다 — 모르는 이벤트라고 에러를 던지면 Paddle이 불필요하게 재시도한다.
//
// transaction.completed(upsertTransaction)는 paddle_subscriptions를 절대 건드리지 않는
// 완전히 별도 경로다 — Pro 권한 판정(lib/paddle/getUserPlan.ts)은 여전히
// paddle_subscriptions만 읽으며, paddle_transactions는 결제 이력 표시 전용 부가 테이블이다.
export async function processPaddleEvent(event: EventEntity) {
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled:
      return upsertSubscription(event.data);
    case EventName.TransactionCompleted:
      return upsertTransaction(event.data);
    default:
      return;
  }
}

async function upsertSubscription(data: SubscriptionCreatedNotification | SubscriptionNotification) {
  // Paddle customer의 email로 JobCal user를 찾는 대신, 체크아웃 시
  // Paddle.Checkout.open({ customData: { user_id } })로 실어 보낸 값을 그대로 읽는다
  // (다음 단계인 체크아웃 구현에서 채워짐). customData가 없거나 user_id가 문자열이
  // 아니면 이 이벤트로는 어떤 JobCal user와도 연결할 수 없다는 뜻이므로, 에러를 던지지
  // 않고 로그만 남기고 종료한다 — 재시도해도 customData는 바뀌지 않으므로 재시도 루프를
  // 만들 이유가 없다(호출부가 2xx를 반환하게 됨).
  const userId = data.customData && typeof data.customData.user_id === "string" ? data.customData.user_id : null;

  if (!userId) {
    console.error(
      `[paddle webhook] customData.user_id 없음 (subscription ${data.id}) — 연결할 JobCal user를 알 수 없어 건너뜀`
    );
    return;
  }

  const admin = createAdminClient();

  // paddle_subscriptions.paddle_customer_id가 paddle_customers.paddle_customer_id를
  // FK로 참조하므로, customers를 먼저 upsert해야 한다.
  const { error: customerError } = await admin
    .from("paddle_customers")
    .upsert({ user_id: userId, paddle_customer_id: data.customerId }, { onConflict: "user_id" });

  if (customerError) {
    if (isMissingUser(customerError)) {
      // user_id가 이미 삭제된 계정(auth.users에 없음) — 예: 계정 삭제 직후 도착한
      // 뒤늦은 웹훅. 정상적인 레이스이지 오류가 아니므로 재시도를 유발하지 않는다.
      console.warn(`[paddle webhook] 존재하지 않는 user_id, 무시: ${userId}`);
      return;
    }
    throw customerError;
  }

  const { error: subscriptionError } = await admin.from("paddle_subscriptions").upsert(
    {
      paddle_subscription_id: data.id,
      user_id: userId,
      paddle_customer_id: data.customerId,
      status: data.status,
      price_id: data.items[0]?.price?.id ?? "",
      scheduled_change: data.scheduledChange,
    },
    { onConflict: "paddle_subscription_id" }
  );

  if (subscriptionError) {
    if (isMissingUser(subscriptionError)) {
      console.warn(`[paddle webhook] 존재하지 않는 user_id, 무시: ${userId}`);
      return;
    }
    throw subscriptionError;
  }
}

// upsertSubscription과 완전히 분리된 별도 함수 — paddle_subscriptions/Pro 판정에는 전혀
// 관여하지 않고 오직 paddle_transactions(Settings > Plan의 결제 이력 표시용)만 쓴다.
// user_id 연결 원칙은 동일하게 customData.user_id만 사용한다(email 매칭 금지).
async function upsertTransaction(data: TransactionNotification) {
  const userId = data.customData && typeof data.customData.user_id === "string" ? data.customData.user_id : null;

  if (!userId) {
    console.error(
      `[paddle webhook] customData.user_id 없음 (transaction ${data.id}) — 연결할 JobCal user를 알 수 없어 건너뜀`
    );
    return;
  }

  // 이론상 존재해야 하는 값들이지만(완료된 결제이므로), 타입상 nullable이라 방어적으로
  // 확인한다. 없으면 에러를 던지지 않고 로그만 남기고 건너뛴다 — 재시도해도 이 값들이
  // 채워지지는 않으므로 재시도 루프를 만들 이유가 없다(호출부가 2xx를 반환).
  if (!data.customerId) {
    console.error(`[paddle webhook] customerId 없음 (transaction ${data.id}) — 결제 이력 저장을 건너뜀`);
    return;
  }

  const grandTotal = data.details?.totals?.grandTotal;
  if (!grandTotal) {
    console.error(`[paddle webhook] grandTotal 없음 (transaction ${data.id}) — 결제 이력 저장을 건너뜀`);
    return;
  }

  const admin = createAdminClient();

  // paddle_transaction_id(PK) 기준 upsert이므로 같은 이벤트가 여러 번 재전송되어도
  // 행이 하나로 수렴한다(idempotent). grand_total은 Paddle이 보낸 원본 최소 통화 단위
  // 문자열을 그대로 저장한다 — number/float로 변환하지 않는다(부동소수점 오차 방지).
  const { error } = await admin.from("paddle_transactions").upsert(
    {
      paddle_transaction_id: data.id,
      user_id: userId,
      paddle_customer_id: data.customerId,
      paddle_subscription_id: data.subscriptionId,
      status: data.status,
      currency_code: data.currencyCode,
      grand_total: grandTotal,
      billed_at: data.billedAt,
    },
    { onConflict: "paddle_transaction_id" }
  );

  if (error) {
    if (isMissingUser(error)) {
      // user_id가 이미 삭제된 계정 — upsertSubscription과 동일한 정상 레이스 케이스.
      console.warn(`[paddle webhook] 존재하지 않는 user_id, 무시: ${userId}`);
      return;
    }
    // paddle_transactions_paddle_customer_id_fkey 위반(예: subscription.created가 아직
    // 도착하지 않아 paddle_customers 행이 없는 이벤트 순서 역전)은 의도적으로 그대로
    // throw한다 — Paddle이 재시도하면 그 사이 customer 행이 생겨 자연히 해소된다
    // (upsertSubscription의 같은 종류 FK 위반과 동일한 기존 설계 원칙).
    throw error;
  }
}

// auth.users(id)를 참조하는 FK(paddle_customers_user_id_fkey, paddle_subscriptions_user_id_fkey)
// 위반만 "존재하지 않는 user_id" 정상 케이스로 취급한다. paddle_subscriptions_paddle_customer_id_fkey
// 같은 다른 FK 위반(예: 기존 paddle_customers 행의 paddle_customer_id를 다른 값으로 바꾸려는데
// 그 옛 값을 참조하는 paddle_subscriptions 행이 있어서 막히는 경우)도 Postgres 코드는 똑같이
// 23503이라, code만 보면 실제 버그를 "user 없음"으로 오판해 조용히 삼키게 된다 — 실제 사고 사례
// (실제 Paddle Sandbox 결제 데이터가 이 오판 때문에 DB에 반영되지 않고 200으로 무시됨) 로
// 확인됨. PostgrestError에는 constraint를 담는 별도 필드가 없어(details/hint/message/code뿐),
// message에 항상 포함되는 제약조건 이름을 파싱해서 정확히 판별한다.
const USER_ID_FK_CONSTRAINTS = new Set([
  "paddle_customers_user_id_fkey",
  "paddle_subscriptions_user_id_fkey",
  "paddle_transactions_user_id_fkey",
]);

function isMissingUser(error: { code?: string; message?: string }) {
  if (error.code !== FOREIGN_KEY_VIOLATION) return false;

  const constraintName = error.message?.match(/violates foreign key constraint "([^"]+)"/)?.[1];
  return constraintName !== undefined && USER_ID_FK_CONSTRAINTS.has(constraintName);
}
