import "server-only";

import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// 기존 메모리 제한과 동일한 정책을 유지한다. IP와 정규화 email 각각이 독립적으로
// 1시간에 5회 미만이어야 하며, 둘 중 하나라도 한도에 도달하면 요청을 허용하지 않는다.
const WINDOW_SECONDS = 60 * 60;
const MAX_REQUESTS_PER_WINDOW = 5;
const MIN_HMAC_SECRET_LENGTH = 32;

type ContactRateLimitKeyKind = "ip" | "email";

function getHmacSecret(): string {
  const secret = process.env.CONTACT_RATE_LIMIT_HMAC_SECRET;
  if (!secret || secret.length < MIN_HMAC_SECRET_LENGTH) {
    throw new Error("CONTACT_RATE_LIMIT_HMAC_SECRET이 설정되지 않았거나 너무 짧습니다.");
  }
  return secret;
}

// kind를 HMAC 입력에 포함해 우연히 같은 문자열인 IP/email도 서로 다른 카운터가 되게 한다.
// DB에는 이 64자 hex digest만 전달하며 IP/email 원문은 절대 저장하지 않는다.
function createHashedKey(kind: ContactRateLimitKeyKind, value: string, secret: string): string {
  return createHmac("sha256", secret).update(`${kind}\0${value}`).digest("hex");
}

export async function checkContactRateLimit(ip: string, normalizedEmail: string): Promise<boolean> {
  const secret = getHmacSecret();
  const ipKey = createHashedKey("ip", ip, secret);
  const emailKey = createHashedKey("email", normalizedEmail, secret);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("check_contact_rate_limit_atomic", {
    p_ip_key: ipKey,
    p_email_key: emailKey,
    p_max_requests: MAX_REQUESTS_PER_WINDOW,
    p_window_seconds: WINDOW_SECONDS,
  });

  if (error) {
    // key나 원문 식별자는 로그에 남기지 않는다. 호출부가 503 fail-closed로 처리한다.
    throw new Error(`문의 rate limit RPC 실패: ${error.code ?? "unknown"}`);
  }
  if (typeof data !== "boolean") {
    throw new Error("문의 rate limit RPC가 올바르지 않은 결과를 반환했습니다.");
  }

  return data;
}
