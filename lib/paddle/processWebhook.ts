import {
  EventName,
  type AdjustmentNotification,
  type EventEntity,
  type SubscriptionCreatedNotification,
  type SubscriptionNotification,
  type TransactionNotification,
} from "@paddle/paddle-node-sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const FOREIGN_KEY_VIOLATION = "23503";

// subscription.created/updated/canceled/paused/resumed + transaction.completed +
// adjustment.created/updated 8개 이벤트만 처리한다. 그 외 이벤트는 구독 설정을 하지
// 않았다면 애초에 안 오지만, 혹시 오더라도 no-op으로 무시한다 — 모르는 이벤트라고
// 에러를 던지면 Paddle이 불필요하게 재시도한다.
//
// transaction.completed(upsertTransaction)/adjustment.*(upsertAdjustment)는
// paddle_subscriptions를 절대 건드리지 않는 완전히 별도 경로다 — Pro 권한 판정
// (lib/paddle/getUserPlan.ts)은 여전히 paddle_subscriptions만 읽으며,
// paddle_transactions/paddle_adjustments는 결제 이력·환불 상태 표시 전용 부가 테이블이다.
export async function processPaddleEvent(event: EventEntity) {
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionResumed:
      return upsertSubscription(event.data, event.occurredAt);
    case EventName.TransactionCompleted:
      return upsertTransaction(event.data);
    case EventName.AdjustmentCreated:
    case EventName.AdjustmentUpdated:
      return upsertAdjustment(event.data);
    default:
      return;
  }
}

async function upsertSubscription(
  data: SubscriptionCreatedNotification | SubscriptionNotification,
  eventOccurredAt: string
) {
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
  if (!(await upsertCustomer(admin, userId, data.customerId))) return;

  const { error: subscriptionError } = await admin.from("paddle_subscriptions").upsert(
    {
      paddle_subscription_id: data.id,
      user_id: userId,
      paddle_customer_id: data.customerId,
      status: data.status,
      price_id: data.items[0]?.price?.id ?? "",
      scheduled_change: data.scheduledChange,
      // 서버 수신 시각이 아니라 Paddle이 서명한 webhook payload의 occurred_at이다. 0028의
      // DB trigger가 이 값과 현재 행을 원자적으로 비교해, 늦게 도착한 과거 이벤트와 같은
      // 이벤트 재전송이 최신 subscription 상태를 덮어쓰지 못하게 한다.
      last_event_occurred_at: eventOccurredAt,
      // lib/notifications.ts의 computeBillingNotification이 past_due 알림의 "발생 주기"를
      // 구분하는 키로 쓴다(0023) — 새 Paddle 이벤트를 구독하지 않고, 이미 받고 있는 이
      // payload의 필드를 하나 더 저장할 뿐이다. 결제 재시도나 scheduled_change 같은 무관한
      // 갱신으로는 바뀌지 않고, 실제로 다음 결제 주기로 넘어갈 때만 바뀐다.
      current_billing_period_starts_at: data.currentBillingPeriod?.startsAt ?? null,
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

  // transaction.completed가 subscription.created보다 먼저 도착하는 이벤트 순서 역전이
  // 실제로 관측되어(라이브 결제 1건에서 재시도 2회 발생) paddle_customers가 아직 없을 수
  // 있다 — upsertSubscription과 동일한 idempotent upsert를 여기서도 먼저 실행해 선행
  // 조건을 스스로 만족시킨다. 이미 존재하면 단순 upsert라 안전하게 그대로 통과한다.
  if (!(await upsertCustomer(admin, userId, data.customerId))) return;

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
    throw error;
  }
}

// upsertTransaction과 완전히 분리된 별도 함수 — paddle_subscriptions/Pro 판정에는 전혀
// 관여하지 않고 오직 paddle_adjustments(Settings > Plan의 환불 상태 표시용)만 쓴다.
async function upsertAdjustment(data: AdjustmentNotification) {
  // credit/chargeback 등 환불이 아닌 조정은 이번 기능 범위 밖이다 — 안전하게 무시한다.
  // 모르는 이벤트라고 에러를 던지면 Paddle이 불필요하게 재시도한다.
  if (data.action !== "refund") {
    return;
  }

  const admin = createAdminClient();

  // AdjustmentNotification에는 customData가 없다 — 체크아웃 시점의 customData는
  // transaction/subscription에만 실리고, adjustment는 결제 이후에 파생되는 이벤트라
  // 실리지 않는다. 대신 transactionId로 이미 저장된 paddle_transactions 행에서
  // user_id를 그대로 가져온다.
  const { data: transactionRow, error: transactionError } = await admin
    .from("paddle_transactions")
    .select("user_id")
    .eq("paddle_transaction_id", data.transactionId)
    .maybeSingle();

  if (transactionError) {
    throw transactionError;
  }

  if (!transactionRow) {
    // transaction.completed가 아직 처리되기 전에 adjustment가 먼저 도착한 이벤트 순서
    // 역전 — 조용히 200으로 삼키지 않고 에러를 던져 Paddle이 재시도하게 한다. 그 사이
    // transaction.completed가 처리되면 재시도 시 정상적으로 연결된다.
    throw new Error(
      `[paddle webhook] paddle_transactions에서 transaction ${data.transactionId}을 찾을 수 없음 — 재시도 유도`
    );
  }

  const userId = transactionRow.user_id;

  // paddle_adjustment_id(PK) 기준 upsert이므로 adjustment.created/updated가 여러 번
  // 재전송되거나 상태가 바뀌어도(pending_approval -> approved 등) 항상 행 1개로
  // 수렴한다(idempotent). total은 Paddle 원본 최소 통화 단위 문자열을 그대로 저장한다 —
  // number/float로 변환하지 않는다(부동소수점 오차 방지).
  const { error } = await admin.from("paddle_adjustments").upsert(
    {
      paddle_adjustment_id: data.id,
      paddle_transaction_id: data.transactionId,
      user_id: userId,
      action: data.action,
      adjustment_type: data.type,
      status: data.status,
      currency_code: data.totals.currencyCode,
      total: data.totals.total,
      reason: data.reason,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    },
    { onConflict: "paddle_adjustment_id" }
  );

  if (error) {
    if (isMissingUser(error)) {
      // user_id가 이미 삭제된 계정 — upsertSubscription/upsertTransaction과 동일한
      // 정상 레이스 케이스.
      console.warn(`[paddle webhook] 존재하지 않는 user_id, 무시: ${userId}`);
      return;
    }
    throw error;
  }
}

// paddle_customers를 idempotent하게 보장한다. 0027부터 user/customer 매핑이 복합 PK이고
// 한 JobCal user가 예외적으로 여러 Paddle customer id를 가질 수 있다. 기존 user_id 행의
// customer id를 UPDATE하지 않고 새 id를 별도 INSERT하므로, 과거 subscription/transaction
// FK를 깨뜨리거나 실제 결제 귀속을 새 customer로 덮어쓰지 않는다.
async function upsertCustomer(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  customerId: string
): Promise<boolean> {
  const { data: existing, error: lookupError } = await admin
    .from("paddle_customers")
    .select("user_id")
    .eq("paddle_customer_id", customerId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    if (existing.user_id !== userId) {
      throw new Error(
        `[paddle webhook] customer ${customerId}가 다른 JobCal user에 이미 연결되어 있음`
      );
    }
    return true;
  }

  const { error } = await admin
    .from("paddle_customers")
    .insert({ user_id: userId, paddle_customer_id: customerId });

  if (error) {
    // subscription.created와 transaction.completed가 동시에 처음 도착하면 둘 다 위 SELECT에서
    // 행이 없다고 본 뒤 INSERT할 수 있다. 한쪽의 PK insert가 먼저 성공한 정상 레이스인지
    // 다시 확인하고, 같은 user의 같은 customer면 성공으로 수렴시킨다.
    if (error.code === "23505") {
      const { data: raced, error: racedLookupError } = await admin
        .from("paddle_customers")
        .select("user_id")
        .eq("paddle_customer_id", customerId)
        .maybeSingle();
      if (racedLookupError) throw racedLookupError;
      if (raced?.user_id === userId) return true;
    }
    if (isMissingUser(error)) {
      // user_id가 이미 삭제된 계정(auth.users에 없음) — 예: 계정 삭제 직후 도착한
      // 뒤늦은 웹훅. 정상적인 레이스이지 오류가 아니므로 재시도를 유발하지 않는다.
      console.warn(`[paddle webhook] 존재하지 않는 user_id, 무시: ${userId}`);
      return false;
    }
    throw error;
  }
  return true;
}

// auth.users(id)를 참조하는 FK 위반만 "존재하지 않는 user_id" 정상 케이스로 취급한다.
// PostgrestError에는 constraint 전용 필드가 없어 message에서 정확한 제약 이름을 확인한다.
const USER_ID_FK_CONSTRAINTS = new Set([
  "paddle_customers_user_id_fkey",
  "paddle_subscriptions_user_id_fkey",
  "paddle_transactions_user_id_fkey",
  "paddle_adjustments_user_id_fkey",
]);

function isMissingUser(error: { code?: string; message?: string }) {
  if (error.code !== FOREIGN_KEY_VIOLATION) return false;

  const constraintName = error.message?.match(/violates foreign key constraint "([^"]+)"/)?.[1];
  return constraintName !== undefined && USER_ID_FK_CONSTRAINTS.has(constraintName);
}
