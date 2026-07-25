import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 세션 토큰 갱신 전용 헬퍼.
// 로그인 화면이 아직 없으므로 인증 여부에 따른 리다이렉트 등 접근 제어는 하지 않는다.
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // .env.local이 아직 없는 상태(이번 단계 범위)에서도 기존 페이지가 정상 동작해야 하므로,
  // 환경변수가 설정되기 전까지는 세션 갱신을 건너뛰고 요청을 그대로 통과시킨다.
  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() 호출 자체가 만료된 세션 토큰을 갱신하고 쿠키에 반영한다.
  await supabase.auth.getUser();

  return supabaseResponse;
}
