import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaddleInstance } from "@/lib/paddle/paddleClient";

export const runtime = "nodejs";

// Paddle에서 여전히 청구가 발생할 수 있는 상태. canceled/paused는 Paddle 쪽에서 이미
// 청구가 끝난 상태라 cancel을 다시 호출하지 않는다(이미 종료된 구독에 또 취소를
// 요청하면 Paddle API가 에러를 반환할 수 있다). scheduled_change로 해지가 예약되어
// 있어도 status는 그 발효 시점까지 active/trialing/past_due로 남아있고 Paddle 구독은
// 실제로 살아있으므로, 계정을 삭제할 때는 예약일을 기다리지 않고 이 상태들에서 즉시
// 취소한다.
const BILLABLE_STATUSES = ["active", "trialing", "past_due"];

// 현재 로그인한 사용자 "본인"의 auth.users 행만 admin API로 삭제한다. 클라이언트가
// user_id를 요청 바디로 보내는 방식은 절대 쓰지 않는다 — 임의의 다른 계정을 지정해
// 삭제하는 것을 막기 위해, 삭제 대상은 항상 이 요청의 쿠키 기반 세션(supabase.auth.getUser())
// 에서만 얻는다. companies 등 사용자 관련 테이블은 모두 auth.users(id)를 ON DELETE CASCADE로
// 참조하므로(supabase/migrations 참고), 이 auth.users 행 삭제만으로 나머지 데이터가
// DB 레벨에서 함께 삭제된다 — 테이블별로 개별 삭제를 호출하지 않는다.
//
// 순서가 중요하다: Paddle 구독 즉시 취소 -> 취소 성공 확인 -> Supabase 계정 삭제.
// 반대 순서(계정 먼저 삭제)로 하면 Paddle 구독이 계정 삭제 이후에도 계속 청구될 수
// 있는데, 계정이 없으면 사용자가 로그인해서 Customer Portal로 직접 취소할 방법이
// 없어진다. Paddle 취소가 실패하면 계정 삭제 자체를 진행하지 않는다.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "계정 삭제 기능이 아직 설정되지 않았습니다." }, { status: 500 });
  }

  // subscription id는 클라이언트가 지정할 수 없다 — 항상 이 세션의 user.id로만 본인
  // 행을 조회한다(paddle_subscriptions_select_own RLS로 이중 보장).
  const { data: subscriptionRow, error: subscriptionError } = await supabase
    .from("paddle_subscriptions")
    .select("paddle_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    console.error("[account/delete] 구독 조회 실패:", subscriptionError.message);
    return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
  }

  if (subscriptionRow && BILLABLE_STATUSES.includes(subscriptionRow.status)) {
    try {
      const paddle = getPaddleInstance();
      await paddle.subscriptions.cancel(subscriptionRow.paddle_subscription_id, {
        effectiveFrom: "immediately",
      });
    } catch (error) {
      // Paddle API 오류 내용(키, 응답 본문 등)은 클라이언트에 노출하지 않고 로그에만
      // 남긴다. 취소가 실패하면 계정 삭제를 진행하지 않는다 — 그대로 두면 계정 없이
      // 청구만 계속되는 상황이 되어 더 나쁘다.
      console.error(
        "[account/delete] Paddle 구독 취소 실패:",
        error instanceof Error ? error.message : error
      );
      return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    // 사용자 식별 정보는 로그에 남기지 않고 진단에 필요한 정보만 출력한다.
    console.error("[account/delete] auth.admin.deleteUser 실패:", {
      status: error.status,
      message: error.message,
    });
    return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
