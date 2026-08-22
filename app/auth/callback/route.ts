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

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = resolveNextPath(searchParams.get("next"), "/dashboard");
  const locale = resolveOAuthLocale(searchParams);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // "신규 가입인지"를 created_at/last_sign_in_at 시간차로 추측하지 않는다 — 이 계정에
      // language가 아직 없을 때만 기록한다. 신규 가입이든, 예전에 language 없이 가입해
      // 아직 한 번도 저장된 적 없는 기존 계정이든 동일하게 취급한다(둘 다 "아직 확정된
      // 언어가 없다"는 점은 같다). 이미 값이 있으면(다른 화면에서 로그인) 절대 덮어쓰지
      // 않는다. 이 호출이 실패해도 로그인 자체는 이미 성공했으므로 흐름을 막지 않는다(로그만
      // 남김).
      if (!data.user.user_metadata?.language) {
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
