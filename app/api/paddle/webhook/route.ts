import { NextResponse } from "next/server";
import { getPaddleInstance } from "@/lib/paddle/paddleClient";
import { processPaddleEvent } from "@/lib/paddle/processWebhook";

export const runtime = "nodejs";

// Paddle이 호출하는 webhook — Supabase 로그인 세션이 없으므로 이 경로는
// lib/supabase/proxy.ts의 PROTECTED_PATH_PREFIXES에 추가하지 않는다(추가하면 /login으로
// 리다이렉트되어 Paddle이 이벤트를 영구히 전달하지 못한다).
//
// signature 검증은 반드시 원문(raw) body로 해야 하므로 request.json()이 아니라
// request.text()로 읽는다 — 한 번이라도 파싱/재직렬화를 거치면 Paddle이 서명한 바이트열과
// 달라져 검증이 항상 실패한다.
//
// 성공(2xx) 여부만이 Paddle의 재시도를 멈춘다. signature 검증 실패인지, DB 오류인지
// 구분해서 401/500을 나누지 않고 하나의 catch에서 항상 동일한 5xx로 응답한다 — 서명
// 실패와 잘못된/회전된 secret은 여기서 구분할 수 없고, 어느 쪽이든 재시도되면 자연히
// 해소되기 때문이다.
export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET ?? "";

  if (!signature || !rawBody || !secret) {
    return NextResponse.json({ error: "Missing signature or body" }, { status: 400 });
  }

  try {
    const paddle = getPaddleInstance();
    const event = await paddle.webhooks.unmarshal(rawBody, secret, signature);

    if (event) {
      await processPaddleEvent(event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[paddle webhook] 처리 실패:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
