import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { resolveNextPath } from "@/lib/auth/nextPath";

// 이 앱은 이메일 회원가입 확인(email)과 비밀번호 재설정(recovery)만 처리한다.
const ALLOWED_EMAIL_OTP_TYPES: EmailOtpType[] = ["email", "recovery"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = resolveNextPath(searchParams.get("next"), "/");

  if (token_hash && ALLOWED_EMAIL_OTP_TYPES.includes(type as EmailOtpType)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });

    if (!error) {
      if (type === "email") {
        // verifyOtp() 성공 시 세션이 이미 생성되지만, /auth/confirmed는 곧바로 signOut한 뒤
        // 사용자가 직접 로그인하게 한다(아래 참고) — 그래서 여기서 바로 next로 보내지 않고,
        // next(이미 위에서 resolveNextPath로 검증됨)를 /auth/confirmed에 그대로 넘겨 그
        // 페이지가 최종적으로 /login?next=...으로 이어가게 한다. next가 없으면(기본값 "/")
        // 쿼리 자체를 붙이지 않아 기존 동작(그냥 /auth/confirmed)과 완전히 동일하다.
        const confirmedUrl = new URL("/auth/confirmed", origin);
        if (next !== "/") confirmedUrl.searchParams.set("next", next);
        return NextResponse.redirect(confirmedUrl);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const failureRedirect =
    type === "recovery" ? "/forgot-password?error=reset_failed" : "/login?error=confirm_failed";
  return NextResponse.redirect(`${origin}${failureRedirect}`);
}
