import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// 이 앱은 이메일 회원가입 확인만 처리한다. 비밀번호 재설정 등 다른 OTP 타입은 아직 지원하지 않는다.
const ALLOWED_EMAIL_OTP_TYPES: EmailOtpType[] = ["email"];

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
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirm_failed`);
}
