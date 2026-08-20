import { Environment, LogLevel, Paddle, type PaddleOptions } from "@paddle/paddle-node-sdk";

// 서버 전용. PADDLE_API_KEY는 NEXT_PUBLIC_ 접두사가 없어 서버 코드에서만 읽히고 클라이언트에는
// 절대 노출되지 않는다. app/api/paddle/webhook/route.ts에서만 호출한다.
// NEXT_PUBLIC_PADDLE_ENV로 sandbox/production을 구분한다 — 이 값 자체는 비밀이 아니라
// 이후 단계(체크아웃 등)에서 클라이언트 Paddle.js 초기화에도 그대로 재사용할 수 있어
// NEXT_PUBLIC_ 접두사를 쓴다.
export function getPaddleInstance() {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error("PADDLE_API_KEY is not set");
  }

  const options: PaddleOptions = {
    environment:
      process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? Environment.production : Environment.sandbox,
    logLevel: LogLevel.error,
  };

  return new Paddle(apiKey, options);
}
