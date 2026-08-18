import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 배포 전 최종 체크 2차: "공개 경로 allowlist, 그 외 전부 보호"였던 이전 구조는 존재하지
// 않는 URL(오타·끊긴 링크 등)도 전부 /login으로 307 리다이렉트해버려 app/not-found.tsx가
// 비로그인 방문자에게는 절대 보이지 않았다(존재하지 않는 URL이 404 대신 307을 반환하는
// 버그를 실제로 재현·확인함). 실제로 로그인이 필요한 화면은 (app) 라우트 그룹의 5개
// 페이지와, 그 화면에서만 호출되는 API 2개뿐이라 목록을 뒤집어 "보호 경로 allowlist"로
// 바꿨다 — 여기 없는 경로(존재하지 않는 URL 포함)는 이제 미들웨어를 그대로 통과해
// Next.js 자체 라우팅(404는 app/not-found.tsx)으로 넘어간다. 기존에 보호되던 5페이지+API
// 2개의 로그인 요구 동작은 그대로 유지된다.
const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/companies",
  "/calendar",
  "/analytics",
  "/settings",
  "/api/ai/analyze-email",
  "/api/account/delete",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// 세션 토큰 갱신 + 로그인 여부에 따른 접근 제어를 함께 수행한다.
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
