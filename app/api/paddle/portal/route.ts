import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPaddleInstance } from "@/lib/paddle/paddleClient";
import { selectPortalCustomer } from "@/lib/paddle/customerSelection";

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

  const { data: customerRows, error: customerError } = await supabase
    .from("paddle_customers")
    .select("paddle_customer_id, created_at")
    .order("created_at", { ascending: false });

  if (customerError) {
    console.error("[paddle portal] customer 조회 실패:", customerError.message);
    return NextResponse.json({ error: "구독 정보를 불러오지 못했습니다." }, { status: 500 });
  }

  // 아직 한 번도 결제하지 않은 사용자(=paddle_customers 행이 없음)는 포털에 보낼 대상
  // 자체가 없다 — Free 사용자는 이 버튼이 화면에 노출되지 않으므로 정상 흐름에서는
  // 도달하지 않지만, 방어적으로 명확한 에러를 반환한다.
  if (!customerRows?.length) {
    return NextResponse.json({ error: "Paddle 고객 정보가 없습니다." }, { status: 404 });
  }

  const { data: subscriptionRows, error: subscriptionError } = await supabase
    .from("paddle_subscriptions")
    .select("paddle_subscription_id, paddle_customer_id, status, updated_at")
    .order("updated_at", { ascending: false });

  if (subscriptionError) {
    console.error("[paddle portal] subscription 조회 실패:", subscriptionError.message);
    return NextResponse.json({ error: "구독 정보를 불러오지 못했습니다." }, { status: 500 });
  }

  // 정상 사용자는 customer가 하나뿐이다. 0027의 예외적인 다중 customer 상태에서는 현재
  // 유효한 구독이 속한 customer를 우선하고, 없으면 가장 최근 customer를 사용한다. Paddle
  // Portal 세션에는 그 customer 소유 subscription id만 넘겨 서로 다른 Paddle customer의
  // 구독을 한 세션에 섞지 않는다.
  const portalCustomer = selectPortalCustomer(customerRows, subscriptionRows ?? []);
  if (!portalCustomer) {
    return NextResponse.json({ error: "Paddle 고객 정보가 없습니다." }, { status: 404 });
  }

  try {
    const paddle = getPaddleInstance();
    const session = await paddle.customerPortalSessions.create(
      portalCustomer.customerId,
      portalCustomer.subscriptionIds
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
