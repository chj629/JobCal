// app/auth/callback와 app/auth/confirm이 공유하는 next 경로 검증. 로그인/인증 이후
// 리다이렉트할 경로가 앱 내부("/"로 시작하고 "//"나 "://"를 포함하지 않는 값)만
// 가리키도록 강제해 오픈 리다이렉트를 막는다.
export function resolveNextPath(rawNext: string | null, fallback: string): string {
  if (!rawNext) return fallback;
  if (!rawNext.startsWith("/")) return fallback;
  if (rawNext.startsWith("//")) return fallback;
  if (rawNext.includes("://")) return fallback;
  return rawNext;
}

// 랜딩/ /pricing의 비로그인 Pro CTA가 /login?next=/pricing&checkout=pro 로 이동시킬 때
// 쓰는 확장. next는 위 resolveNextPath와 완전히 동일한 안전 검증을 거치고(오픈 리다이렉트
// 방지 규칙 그대로), checkout=pro가 함께 왔을 때만 그 next 경로에 "?checkout=pro"를 붙여
// 하나의 next 값으로 합친다 — /auth/callback(Google 로그인)은 여전히 next 파라미터
// 하나만 이해하면 되므로 그 라우트는 건드리지 않는다. next가 안전하지 않으면(또는 없으면)
// null을 돌려주고, 호출부는 항상 하던 대로(기존 /dashboard 등) 이동한다 — 결제 의도가
// 없는 일반 로그인/가입 동작은 전혀 바뀌지 않는다.
export function buildCheckoutNext(rawNext: string | null, rawCheckout: string | null): string | null {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//") || rawNext.includes("://")) {
    return null;
  }
  return rawCheckout === "pro" ? `${rawNext}?checkout=pro` : rawNext;
}

// 이메일/비밀번호 로그인·가입처럼 클라이언트에서 바로 router.push할 때 쓰는 버전.
// buildCheckoutNext가 null이면(next 없음/안전하지 않음) fallback으로 보낸다.
export function resolvePostAuthRedirect(
  rawNext: string | null,
  rawCheckout: string | null,
  fallback: string
): string {
  return buildCheckoutNext(rawNext, rawCheckout) ?? fallback;
}
