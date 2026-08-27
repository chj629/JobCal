import { createServerClient } from "@supabase/ssr";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// 배포 전 최종 체크 2차: "공개 경로 allowlist, 그 외 전부 보호"였던 이전 구조는 존재하지
// 않는 URL(오타·끊긴 링크 등)도 전부 /login으로 307 리다이렉트해버려 app/not-found.tsx가
// 비로그인 방문자에게는 절대 보이지 않았다(존재하지 않는 URL이 404 대신 307을 반환하는
// 버그를 실제로 재현·확인함). 실제로 로그인이 필요한 화면은 (app) 라우트 그룹의 5개
// 페이지와, 그 화면에서만 호출되는 로그인 전용 API뿐이라 목록을 뒤집어 "보호 경로
// allowlist"로 바꿨다 — 여기 없는 경로(존재하지 않는 URL 포함)는 이제 미들웨어를 그대로
// 통과해 Next.js 자체 라우팅(404는 app/not-found.tsx)으로 넘어간다. 기존에 보호되던
// 5페이지+API의 로그인 요구 동작은 그대로 유지된다.
// 유지보수 메모: 새로운 로그인 전용 page/API를 추가하면 반드시 이 목록에도 추가해야
// 한다 — 여기 없는 경로는 비로그인 사용자도 그대로 통과한다(공개 경로 취급). 단,
// Paddle webhook(app/api/paddle/webhook)처럼 Paddle 서버가 호출하는 경로는 로그인
// 세션이 없으므로 여기 넣지 않는다 — 넣으면 /login으로 리다이렉트되어 웹훅이 실패한다.
const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/companies",
  "/calendar",
  "/analytics",
  "/settings",
  "/api/ai/analyze-email",
  "/api/account/delete",
  "/api/paddle/checkout-eligibility",
  "/api/paddle/portal",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// 모바일 앱(jobcal-mobile)은 쿠키가 없으므로 Authorization: Bearer <access_token>으로
// 인증한다. 모바일이 실제로 호출하는 API 경로들에만 정확히 일치하는 좁은 예외를 두어
// 미들웨어의 쿠키 기반 /login 리다이렉트를 건너뛰고 각 route.ts까지 도달하게 하며, 실제
// 토큰 검증은 여기가 아니라 그 route.ts들(app/api/ai/analyze-email,
// app/api/account/delete)이 수행한다 — 이 함수는 "Bearer 헤더가 있으니 route.ts에게 검증을
// 맡긴다"는 판단만 하고, 헤더가 없거나 이 목록 밖의 경로면 기존 쿠키 전용 동작 그대로다.
// 새 모바일 전용 API를 추가할 때만 이 목록에 그 경로를 추가한다 — 목록에 없는 경로는
// 이 예외의 영향을 전혀 받지 않는다.
const BEARER_EXEMPT_API_PATHS = new Set(["/api/ai/analyze-email", "/api/account/delete"]);

function hasBearerAuthForExemptApiPath(request: NextRequest) {
  return (
    BEARER_EXEMPT_API_PATHS.has(request.nextUrl.pathname) &&
    !!request.headers.get("authorization")?.startsWith("Bearer ")
  );
}

// 세션 토큰 갱신 + 로그인 여부에 따른 접근 제어를 함께 수행한다.
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    const pathname = request.nextUrl.pathname;

    // production에서 이 값들이 비어 있으면 세션 확인 자체가 불가능하므로, 보호 경로는
    // "확인 불가 = 거부"로 fail-closed 처리한다(로그인 여부를 판단할 수 없다고 해서
    // 통과시키지 않는다). 값이나 어떤 env 변수가 비었는지는 로그에 남기지 않는다.
    if (process.env.NODE_ENV === "production" && isProtectedPath(pathname)) {
      console.error("[auth] Supabase 환경변수 누락으로 보호 경로 접근을 차단했습니다.");
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // .env.local이 아직 없는 로컬 개발 환경에서도 기존 페이지가 정상 동작해야 하므로,
    // development에서는(그리고 production의 공개 경로는) 세션 갱신을 건너뛰고 요청을
    // 그대로 통과시킨다.
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
    error: getUserError,
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedPath(pathname) && !hasBearerAuthForExemptApiPath(request)) {
    // getUser()는 "진짜 로그아웃/세션 무효" 상태와 "Supabase Auth API에 순간적으로 접근하지
    // 못한 상태(네트워크 타임아웃 등 재시도하면 되는 오류)"를 둘 다 { user: null }로 반환한다
    // — GoTrueClient._getUser()의 catch가 AuthRetryableFetchError도 AuthError로 잡아
    // throw 없이 { user: null, error }만 돌려주기 때문이다(세션을 실제로 지우는
    // _removeSession()은 이보다 더 구체적인 isAuthSessionMissingError일 때만 호출된다).
    // 이 둘을 구분하지 않고 무조건 /login으로 보내면, 쿠키(=실제 세션)는 멀쩡한데 그 순간의
    // 네트워크 히크업 하나로 로그인 화면을 보게 된다. @supabase/supabase-js가 공개
    // export하는 판별 함수를 그대로 써서(문자열/error.name 하드코딩 없이) retryable
    // 오류일 때만 이번 요청의 리다이렉트를 건너뛴다 — 쿠키는 여기서도 전혀 건드리지
    // 않고, 다음 요청에서 다시 검증된다. 이건 "인증 성공으로 간주"하는 것도, 보호 경로를
    // 무조건 통과시키는 것도 아니다 — user는 여전히 null이라 이 요청에서 어떤 데이터
    // 조회도 auth.uid() 기반 RLS를 그대로 통과해야 하고(진짜 세션이 없으면 빈 결과만
    // 받는다), 다음 몇 요청 중 하나가 진짜 세션 없음(retryable이 아닌 에러 또는 에러
    // 없이 user만 null)으로 확인되는 즉시 정상적으로 /login으로 보내진다.
    if (getUserError && isAuthRetryableFetchError(getUserError)) {
      console.warn(
        "[auth] Supabase Auth 세션 확인이 일시적으로 실패해(retryable) 이번 요청은 리다이렉트하지 않고 통과시킵니다.",
        { path: pathname, errorName: getUserError.name }
      );
      return supabaseResponse;
    }

    if (getUserError) {
      console.warn("[auth] 세션이 유효하지 않아 로그인 화면으로 이동합니다.", {
        path: pathname,
        errorName: getUserError.name,
      });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 루트("/")와 한국어 랜딩("/ko")도 로그인 상태면 랜딩페이지를 거치지 않고 곧장
  // /dashboard로 보낸다. login/signup과 동일한 이유(이미 로그인된 사용자에게 보일
  // 필요 없는 화면)라 같은 분기에 합쳤다 — app/page.tsx·app/ko/page.tsx(랜딩) 자체는
  // 건드리지 않고, 서버 미들웨어 단계에서 리다이렉트하므로 클라이언트에 랜딩이 잠깐
  // 그려졌다 넘어가는 flash가 없다. /login·/signup의 /ko 짝(/ko/login, /ko/signup)도
  // 같은 이유로 동일하게 취급한다 — startsWith("/login")이 "/ko/login"까지 잡아주진
  // 않아 별도로 나열해야 한다. /forgot-password는 로그인 상태에서도 재설정 메일을
  // 요청할 수 있어야 하며, /update-password는 페이지/API 자체가 recovery grant를 별도로
  // 검증하므로 여기서는 기존처럼 로그인 페이지로 강제 이동시키지 않는다.
  if (
    user &&
    (pathname === "/" ||
      pathname === "/ko" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/ko/login") ||
      pathname.startsWith("/ko/signup"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
