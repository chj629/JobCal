import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// 이 앱은 이메일 회원가입 확인(email)과 비밀번호 재설정(recovery)만 처리한다.
const ALLOWED_EMAIL_OTP_TYPES: EmailOtpType[] = ["email", "recovery"];

// next는 반드시 앱 내부 경로만 허용한다 (오픈 리다이렉트 방지).
function resolveNextPath(rawNext: string | null): string {
  if (!rawNext) return "/";
  if (!rawNext.startsWith("/")) return "/";
  if (rawNext.startsWith("//")) return "/";
  if (rawNext.includes("://")) return "/";
  return rawNext;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = resolveNextPath(searchParams.get("next"));

  if (token_hash && ALLOWED_EMAIL_OTP_TYPES.includes(type as EmailOtpType)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });

    if (!error) {
      if (type === "email") {
        return NextResponse.redirect(`${origin}/auth/confirmed`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const failureRedirect =
    type === "recovery" ? "/forgot-password?error=reset_failed" : "/login?error=confirm_failed";
  return NextResponse.redirect(`${origin}${failureRedirect}`);
}
