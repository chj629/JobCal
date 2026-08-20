import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaddleInstance } from "@/lib/paddle/paddleClient";

export const runtime = "nodejs";

// 로그인한 사용자 "본인"의 Paddle Customer Portal 세션만 발급한다. app/api/account/delete와
// 동일한 원칙 — customerId를 클라이언트가 요청 바디로 보내는 방식은 쓰지 않고, 항상 이
// 요청의 쿠키 기반 세션(supabase.auth.getUser())에서 얻은 user.id로만 paddle_customers를
// 조회한다. paddle_customers/paddle_subscriptions는 select-only RLS(auth.uid() = user_id,
// 0017/0018)라 여기서도 다른 사용자의 행을 조회할 방법이 없다.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: customerRow, error: customerError } = await supabase
    .from("paddle_customers")
    .select("paddle_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerError) {
    console.error("[paddle portal] customer 조회 실패:", customerError.message);
    return NextResponse.json({ error: "구독 정보를 불러오지 못했습니다." }, { status: 500 });
  }

  // 아직 한 번도 결제하지 않은 사용자(=paddle_customers 행이 없음)는 포털에 보낼 대상
  // 자체가 없다 — Free 사용자는 이 버튼이 화면에 노출되지 않으므로 정상 흐름에서는
  // 도달하지 않지만, 방어적으로 명확한 에러를 반환한다.
  if (!customerRow) {
    return NextResponse.json({ error: "Paddle 고객 정보가 없습니다." }, { status: 404 });
  }

  const { data: subscriptionRows, error: subscriptionError } = await supabase
    .from("paddle_subscriptions")
    .select("paddle_subscription_id")
    .eq("user_id", user.id);

  if (subscriptionError) {
    console.error("[paddle portal] subscription 조회 실패:", subscriptionError.message);
    return NextResponse.json({ error: "구독 정보를 불러오지 못했습니다." }, { status: 500 });
  }

  const subscriptionIds = (subscriptionRows ?? []).map((row) => row.paddle_subscription_id);

  try {
    const paddle = getPaddleInstance();
    const session = await paddle.customerPortalSessions.create(
      customerRow.paddle_customer_id,
      subscriptionIds
    );

    // 세션 객체 전체(customerId, 세션 id, 서브스크립션별 딥링크 등)가 아니라 실제로
    // 필요한 overview URL 하나만 클라이언트에 돌려준다. 이 URL은 1회성/시간 제한이 있어
    // 매 클릭마다 새로 발급해야 한다(캐시하지 않는다).
    return NextResponse.json({ url: session.urls.general.overview });
  } catch (error) {
    console.error("[paddle portal] 세션 생성 실패:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "구독 관리 페이지를 여는 데 실패했습니다." }, { status: 500 });
  }
}
