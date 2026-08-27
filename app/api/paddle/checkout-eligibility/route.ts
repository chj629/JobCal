import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaddleInstance } from "@/lib/paddle/paddleClient";
import { CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES } from "@/lib/paddle/checkoutEligibility";

export const runtime = "nodejs";

// Checkout을 실제로 열기 직전 호출하는 서버 판정이다. Pro entitlement(getUserPlan)와 달리
// paused도 기존 subscription 관리/재개 대상이므로 새 subscription 생성을 차단한다.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // webhook 미러가 이미 최신이면 Paddle API를 부르기 전에 빠르게 차단한다. 조회 대상은
  // 요청 세션 본인의 행으로 RLS가 고정하며, 클라이언트가 user_id를 넘기지 않는다.
  const { data: localSubscription, error: subscriptionError } = await supabase
    .from("paddle_subscriptions")
    .select("paddle_subscription_id")
    .in("status", CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES)
    .limit(1)
    .maybeSingle();

  if (subscriptionError) {
    console.error("[paddle checkout] subscription 사전 검증 실패:", subscriptionError.message);
    return NextResponse.json({ error: "구독 상태를 확인하지 못했습니다." }, { status: 500 });
  }

  if (localSubscription) {
    return NextResponse.json(
      { allowed: false, reason: "existing_subscription" },
      { status: 409 }
    );
  }

  // P0-1 이후 한 JobCal user가 예외적으로 여러 Paddle customer를 가질 수 있다. 가장 최근
  // customer id는 허용 응답에서 Checkout 재사용용으로 돌려주고, 모든 customer id에 대해
  // Paddle 원본 상태도 조회해 webhook이 아직 DB에 반영되기 전인 구독을 놓치지 않는다.
  const { data: customerRows, error: customerError } = await supabase
    .from("paddle_customers")
    .select("paddle_customer_id, created_at")
    .order("created_at", { ascending: false });

  if (customerError) {
    console.error("[paddle checkout] customer 사전 검증 실패:", customerError.message);
    return NextResponse.json({ error: "구독 상태를 확인하지 못했습니다." }, { status: 500 });
  }

  const customerIds = (customerRows ?? []).map((row) => row.paddle_customer_id);

  if (customerIds.length > 0) {
    try {
      const paddle = getPaddleInstance();
      const subscriptions = await paddle.subscriptions
        .list({
          customerId: customerIds,
          status: CHECKOUT_BLOCKING_SUBSCRIPTION_STATUSES,
          perPage: 1,
        })
        .next();

      if (subscriptions.length > 0) {
        return NextResponse.json(
          { allowed: false, reason: "existing_subscription" },
          { status: 409 }
        );
      }
    } catch (error) {
      // Paddle 원본 확인에 실패했을 때 DB만 믿고 Checkout을 열면 webhook 지연 중 중복
      // subscription을 만들 수 있으므로 fail-closed로 막는다.
      console.error(
        "[paddle checkout] Paddle subscription 사전 검증 실패:",
        error instanceof Error ? error.message : error
      );
      return NextResponse.json({ error: "구독 상태를 확인하지 못했습니다." }, { status: 500 });
    }
  }

  return NextResponse.json({
    allowed: true,
    paddleCustomerId: customerIds[0] ?? null,
  });
}
