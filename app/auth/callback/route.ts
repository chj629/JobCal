import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveNextPath } from "@/lib/auth/nextPath";

// components/auth/{Login,Signup}PageContent.tsx가 signInWithOAuth의 redirectTo에 함께
// 실어 보낸 값. app/auth/confirm/route.ts와 동일한 2택 enum("ko"만 한국어, 그 외 전부
// 일본어) — OAuth 실패/취소 시 되돌아갈 로그인 페이지를 고르는 데만 쓰이고, 그 자체가
// redirect 목적지 문자열이 되지 않으므로 open redirect 표면이 아니다.
function resolveOAuthLocale(searchParams: URLSearchParams): "ja" | "ko" {
  return searchParams.get("locale") === "ko" ? "ko" : "ja";
}

// Google로 처음 가입하는 사용자인지 판단한다. Supabase JS SDK에는 "신규 가입"을 바로
// 알려주는 필드가 없어(email/password의 identities.length===0 트릭과 달리 OAuth는
// 애초에 "이미 있으면 로그인, 없으면 가입"이 한 동작이라 그 신호 자체가 없다), created_at과
// last_sign_in_at을 비교한다 — OAuth는 신규 가입과 최초 로그인이 동시에 일어나므로 두
// 값이 사실상 같은 순간에 기록된다. 반대로 "이미 있던 사용자"는 last_sign_in_at이 이전
// 로그인 때 이미 갱신돼 있어 created_at보다 항상 뒤(오차 범위보다 훨씬 큰 차이)이므로,
// 이 비교가 기존 사용자를 신규로 잘못 판단할 방법은 구조적으로 없다 — 반대 방향(신규
// 사용자를 놓치는 것)으로만 실패할 수 있고, 그 경우 그냥 language를 안 쓰는 것뿐이라
// 안전하다.
function isLikelyNewOAuthUser(user: { created_at: string; last_sign_in_at?: string | null }): boolean {
  if (!user.last_sign_in_at) return false;
  const createdAt = new Date(user.created_at).getTime();
  const lastSignInAt = new Date(user.last_sign_in_at).getTime();
  return Math.abs(lastSignInAt - createdAt) < 5000;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveNextPath(searchParams.get("next"), "/dashboard");
  const locale = resolveOAuthLocale(searchParams);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 신규 가입이 확실하고(위 isLikelyNewOAuthUser) 아직 language가 없을 때만 기록한다
      // — 이미 값이 있으면(기존 계정 로그인) 절대 덮어쓰지 않는다. 이 호출이 실패해도
      // 로그인 자체는 이미 성공했으므로 흐름을 막지 않는다(로그만 남김).
      if (!data.user.user_metadata?.language && isLikelyNewOAuthUser(data.user)) {
        const { error: updateError } = await supabase.auth.updateUser({ data: { language: locale } });
        if (updateError && process.env.NODE_ENV === "development") {
          console.error("[auth/callback] language metadata 저장 실패:", {
            status: updateError.status,
            code: updateError.code,
            message: updateError.message,
            name: updateError.name,
          });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${locale === "ko" ? "/ko" : ""}/login`);
}
