import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출된 경우 무시.
            // proxy.ts가 매 요청마다 세션을 갱신하므로 안전하게 무시할 수 있음.
          }
        },
      },
    }
  );
}

// app/auth/confirm/route.ts의 회원가입 이메일 확인(verifyOtp, type: "email") 전용 — 이
// 브라우저에 이미 다른(또는 같은) 계정의 정상 로그인 세션이 있을 수 있으므로, 이메일
// 인증 자체는 서버에서 검증하되 그 결과로 생기는 세션을 절대 쿠키에 쓰지 않아야 한다.
// persistSession: false면 @supabase/auth-js가 storage를 메모리 전용 어댑터로 바꿔
// 쓰고(GoTrueClient 생성자 확인) BroadcastChannel도 만들지 않는다 — 이 요청이 끝나면
// 세션은 완전히 버려지고 다른 탭에 어떤 신호도 가지 않는다. publishable(anon) key만
// 쓰고 service_role은 쓰지 않는다 — RLS를 우회할 필요가 없는 순수 OTP 검증이다.
// 비밀번호 재설정(recovery)은 /update-password가 이 세션을 그대로 써야 하므로 이 함수를
// 쓰지 않고 기존 createClient()(쿠키 기반)를 그대로 쓴다.
export function createOneOffAuthClient() {
  return createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
