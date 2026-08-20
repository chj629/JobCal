import type { SupabaseClient } from "@supabase/supabase-js";

// "환불 없음" 외 3가지는 paddle_adjustments(action='refund')의 status/adjustment_type을
// 근거로 계산한다 — Settings > Plan 화면이 이 값만 보고 문구를 고른다(계산 로직 자체를
// 화면 쪽에 두지 않는다).
export type RefundStatus = "none" | "refunded" | "partially_refunded" | "pending";

export interface UserTransaction {
  id: string;
  status: string;
  currencyCode: string;
  // Paddle 원본 최소 통화 단위 문자열 그대로(예: JPY는 "780"). 화면 표시 시점에만
  // Intl.NumberFormat으로 포맷한다 — 여기서 number로 변환하지 않는다.
  grandTotal: string;
  billedAt: string | null;
  refundStatus: RefundStatus;
}

interface RefundAdjustmentRow {
  status: string;
  adjustment_type: string;
  total: string;
}

// 승인된(approved) 환불 합계를 원 거래 금액과 비교해 상태를 정한다. 전부 문자열을
// BigInt로 파싱해 정수 연산만 사용한다 — number/부동소수점 연산은 쓰지 않는다.
// rejected/reversed 행은 애초에 인자로 넘기지 않는다(호출부에서 걸러짐).
function computeRefundStatus(grandTotal: string, refundAdjustments: RefundAdjustmentRow[]): RefundStatus {
  const approved = refundAdjustments.filter((a) => a.status === "approved");

  if (approved.length > 0) {
    const approvedTotal = approved.reduce((sum, a) => sum + BigInt(a.total), BigInt(0));
    const isFullByType = approved.some((a) => a.adjustment_type === "full");

    if (isFullByType || approvedTotal >= BigInt(grandTotal)) {
      return "refunded";
    }
    if (approvedTotal > BigInt(0)) {
      return "partially_refunded";
    }
  }

  // approved가 없고 pending_approval만 있으면 "처리 중" — rejected/reversed만 있으면
  // (approved도 pending도 없으면) 여기까지 내려와 "none"이 된다.
  const hasPending = refundAdjustments.some((a) => a.status === "pending_approval");
  if (hasPending) {
    return "pending";
  }

  return "none";
}

// Settings > Plan의 "支払い履歴" 표시 전용 조회. paddle_subscriptions 기반 Pro 판정
// (lib/paddle/getUserPlan.ts, getUserSubscriptionSummary.ts)과는 완전히 독립된 경로다 —
// 이 함수의 반환값은 권한 판정에 절대 쓰이지 않는다. RLS(paddle_transactions_select_own,
// paddle_adjustments_select_own: 둘 다 auth.uid() = user_id)가 본인 행만 걸러주므로
// 여기서 user_id를 별도로 넘기지 않는다 — paddle_adjustments는 PostgREST의 FK 기반
// embedded select로 함께 조회하며, 이 임베드된 행에도 그 테이블 자신의 RLS가 그대로
// 적용된다(다른 사용자의 adjustment가 섞여 들어올 방법이 없다).
export async function getUserTransactionHistory(supabase: SupabaseClient): Promise<UserTransaction[]> {
  const { data, error } = await supabase
    .from("paddle_transactions")
    .select(
      "paddle_transaction_id, status, currency_code, grand_total, billed_at, paddle_adjustments(status, adjustment_type, total)"
    )
    .eq("status", "completed")
    .order("billed_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.paddle_transaction_id,
    status: row.status,
    currencyCode: row.currency_code,
    grandTotal: row.grand_total,
    billedAt: row.billed_at,
    // upsertAdjustment(lib/paddle/processWebhook.ts)가 action !== "refund"인 조정은
    // 애초에 저장하지 않으므로, 여기 담기는 행은 전부 환불 관련 조정이다.
    refundStatus: computeRefundStatus(row.grand_total, row.paddle_adjustments ?? []),
  }));
}
