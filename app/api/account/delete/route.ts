import { NextResponse } from "next/server";
import { createClient as createBearerClient } from "@supabase/supabase-js";
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
// 순서가 중요하다: Paddle 구독 전부 즉시 취소 -> 전부 취소 성공 확인 -> Supabase 계정 삭제.
// 반대 순서(계정 먼저 삭제)로 하면 Paddle 구독이 계정 삭제 이후에도 계속 청구될 수
// 있는데, 계정이 없으면 사용자가 로그인해서 Customer Portal로 직접 취소할 방법이
// 없어진다. Paddle 취소가 하나라도 실패하면 계정 삭제 자체를 진행하지 않는다.
export async function POST(request: Request) {
  // 모바일 앱(jobcal-mobile)은 쿠키가 없으므로 Authorization: Bearer <access_token>을
  // 대신 보낸다. lib/supabase/proxy.ts가 이 경로에만 좁게 예외를 두어 여기까지 통과시키므로,
  // 실제 토큰 검증은 이 함수가 담당한다 — app/api/ai/analyze-email/route.ts와 동일한 패턴.
  // anon/publishable key + 그 Authorization 헤더로 만든 클라이언트는 PostgREST/GoTrue가
  // 헤더의 JWT로 auth.uid()를 판정하므로, 아래 paddle_subscriptions 조회/Paddle 취소/계정
  // 삭제 로직은 어느 클라이언트가 들어오든 전혀 수정 없이 동일하게 동작한다. admin(service
  // role) 클라이언트는 기존과 동일하게 createAdminClient()로만 별도로 만들며, 이 Bearer
  // 클라이언트는 여기서도 anon key + RLS일 뿐이다.
  const authHeader = request.headers.get("authorization");
  const supabase = authHeader?.startsWith("Bearer ")
    ? createBearerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      )
    : await createClient();

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
  // 행을 조회한다(paddle_subscriptions_select_own RLS로 이중 보장). paddle_subscriptions는
  // user_id에 unique 제약이 없어(재구독 시 과거 canceled 행 + 새 active 행처럼) 한
  // user_id에 여러 행이 남아 있을 수 있으므로, .single()/.maybeSingle()은 쓰지 않고
  // 항상 배열로 전부 조회한다 — 행이 2개 이상이면 그 두 메서드는 에러를 던진다.
  const { data: subscriptionRows, error: subscriptionError } = await supabase
    .from("paddle_subscriptions")
    .select("paddle_subscription_id, status")
    .eq("user_id", user.id);

  if (subscriptionError) {
    console.error("[account/delete] 구독 조회 실패:", subscriptionError.message);
    return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
  }

  const billableSubscriptions = (subscriptionRows ?? []).filter((row) =>
    BILLABLE_STATUSES.includes(row.status)
  );

  if (billableSubscriptions.length > 0) {
    const paddle = getPaddleInstance();
    // 정상적으로는 활성 구독이 1개뿐이지만, 이중 구독 등 비정상 상태를 포함해 취소가
    // 필요한 구독을 전부 순서대로 취소한다. 하나라도 실패하면 즉시 중단하고 계정
    // 삭제로 넘어가지 않는다 — 일부만 취소된 채로 계정이 삭제되어 나머지가 계속
    // 청구되는 상황을 막기 위함이다.
    for (const row of billableSubscriptions) {
      try {
        await paddle.subscriptions.cancel(row.paddle_subscription_id, {
          effectiveFrom: "immediately",
        });
      } catch (error) {
        // Paddle API 오류 내용(키, 응답 본문 등)은 클라이언트에 노출하지 않고 로그에만
        // 남긴다. 취소가 실패하면 계정 삭제를 진행하지 않는다 — 그대로 두면 계정 없이
        // 청구만 계속되는 상황이 되어 더 나쁘다.
        console.error(
          "[account/delete] Paddle 구독 취소 실패:",
          row.paddle_subscription_id,
          error instanceof Error ? error.message : error
        );
        return NextResponse.json({ error: "계정 삭제에 실패했습니다." }, { status: 500 });
      }
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
