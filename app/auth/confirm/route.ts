import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient, createOneOffAuthClient } from "@/lib/supabase/server";
import { resolveNextPath } from "@/lib/auth/nextPath";

// 이 앱은 이메일 회원가입 확인(email)과 비밀번호 재설정(recovery)만 처리한다.
const ALLOWED_EMAIL_OTP_TYPES: EmailOtpType[] = ["email", "recovery"];

// jobcal-mobile(Expo, app.json의 scheme: "jobcalmobile")의 비밀번호 재설정 화면 딥링크.
// mobile의 Linking.createURL("update-password")가 프로덕션/개발 빌드에서 만드는 값과
// 정확히 동일한 문자열이며, 아래에서 "완전 일치"할 때만 통과시킨다(다른 next 값은 전부
// 기존 resolveNextPath 검증 그대로) — 임의의 커스텀 스킴을 허용하는 오픈 리다이렉트가
// 되지 않도록 하기 위함이다.
const MOBILE_RECOVERY_REDIRECT = "jobcalmobile://update-password";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next");
  const next = resolveNextPath(rawNext, "/");
  // app/signup·app/ko/signup(components/auth/SignupPageContent.tsx)이 이메일 인증
  // 링크에 함께 실어 보낸 값. next와 달리 URL이 아니라 "ja"/"ko" 둘 중 하나로만
  // 취급한다("ko"가 아니면 전부 ja) — 아래에서 고정된 두 경로 중 하나를 고르는 데만
  // 쓰이고 그 자체가 redirect 목적지 문자열이 되지 않으므로 open redirect 표면이 아니다.
  const requestedLocale = searchParams.get("locale") === "ko" ? "ko" : "ja";

  if (token_hash && ALLOWED_EMAIL_OTP_TYPES.includes(type as EmailOtpType)) {
    // 모바일 앱은 쿠키 세션을 쓸 수 없으므로, 여기서 verifyOtp(서버/쿠키 세션)를 호출하지
    // 않고 token_hash를 그대로 앱 딥링크에 실어 넘긴다 — 실제 검증은
    // jobcal-mobile의 update-password 화면이 AsyncStorage 기반 클라이언트로 직접
    // supabase.auth.verifyOtp()를 호출해 수행한다.
    if (type === "recovery" && rawNext === MOBILE_RECOVERY_REDIRECT) {
      const mobileUrl = new URL(MOBILE_RECOVERY_REDIRECT);
      mobileUrl.searchParams.set("token_hash", token_hash);
      mobileUrl.searchParams.set("type", "recovery");
      return NextResponse.redirect(mobileUrl.toString());
    }

    // 회원가입 이메일 확인(email)은 이 브라우저에 이미 다른(또는 같은) 계정의 정상 로그인
    // 세션이 있을 수 있어, 검증 결과로 생기는 세션을 쿠키에 절대 쓰지 않는 일회성
    // 클라이언트로 처리한다(lib/supabase/server.ts의 createOneOffAuthClient 참고) — 그래서
    // /auth/confirmed가 더 이상 signOut을 호출할 필요가 없다. 비밀번호 재설정(recovery)은
    // /update-password가 이 세션을 실제로 써야 하므로 기존과 동일하게 쿠키 기반 서버
    // 클라이언트를 쓴다.
    const supabase = type === "email" ? createOneOffAuthClient() : await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });

    if (!error) {
      if (type === "email") {
        // verifyOtp()가 일회성 클라이언트로 실행돼 이 브라우저에는 어떤 세션도 남지
        // 않으므로, /auth/confirmed는 이제 signOut 없이 곧바로 로그인 화면으로 안내하면
        // 된다 — next(이미 위에서 resolveNextPath로 검증됨)를 /auth/confirmed(또는
        // 가입이 한국어로 시작됐다면 /ko/auth/confirmed — 고정된 두 경로 중 하나로만
        // 분기, next처럼 임의 경로를 받지 않는다)에 그대로 넘겨 그 페이지가 최종적으로
        // /login?next=...(또는 /ko/login?next=...)으로 이어가게 한다. next가 없으면
        // (기본값 "/") 쿼리 자체를 붙이지 않아 기존 동작과 완전히 동일하다.
        const confirmedPath = requestedLocale === "ko" ? "/ko/auth/confirmed" : "/auth/confirmed";
        const confirmedUrl = new URL(confirmedPath, origin);
        if (next !== "/") confirmedUrl.searchParams.set("next", next);
        return NextResponse.redirect(confirmedUrl);
      }
      // 비밀번호 재설정은 resetPasswordForEmail의 redirectTo(=next, 이미 요청 locale의
      // /update-password를 가리키도록 구성됨)를 그대로 신뢰해 이동한다 — 별도 locale
      // 분기가 필요 없다.
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 실패 시에도 원래 시작한 언어로 돌려보낸다. recovery는 next(이미 검증된
  // /update-password 또는 /ko/update-password)의 접두사로 판단하고, email 확인은 signup이
  // 보낸 locale 파라미터로 판단한다 — 두 경우 모두 "/forgot-password"·"/login" 중 고정된
  // 하나를 고르는 데만 쓰여 여기서도 open redirect 표면이 생기지 않는다.
  const isKoRecovery = type === "recovery" && next.startsWith("/ko/");
  const failureRedirect =
    type === "recovery"
      ? `${isKoRecovery ? "/ko" : ""}/forgot-password?error=reset_failed`
      : `${requestedLocale === "ko" ? "/ko" : ""}/login?error=confirm_failed`;
  return NextResponse.redirect(`${origin}${failureRedirect}`);
}
