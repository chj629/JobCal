// app/layout.tsx(루트 레이아웃, locked LocaleProvider 밖)에서 <Script
// strategy="beforeInteractive">에 그대로 넣을 스크립트 문자열을 만든다.
// @next/eslint-plugin-next의 no-before-interactive-script-outside-document 규칙이
// "app/ 디렉터리 안의 파일인지"만 파일 경로로 판단하므로(App Router 자체를 인식하지
// 못한다), <Script> JSX는 반드시 app/*.tsx 파일 안에서 직접 렌더링해야 경고가 없다 —
// 그래서 JSX가 아니라 문자열 생성 로직만 여기서 공유한다.
//
// 예전에는 app/page.tsx, app/login/page.tsx, app/signup/page.tsx가 각자 이 Script를
// 렌더링했다 — 이 페이지들의 언어 전환 버튼(LanguageSwitcher)이 <Link>로 ko 짝
// 페이지로 이동했다가 다시 ja로 돌아오는 클라이언트 사이드(soft) 네비게이션을 할 때마다,
// beforeInteractive 전용인 이 Script가 "이미 하이드레이션된 트리에 새로 나타난 일반
// 컴포넌트"로 취급돼 React가 "Encountered a script tag while rendering React
// component" 콘솔 에러를 던졌다(beforeInteractive는 최초 문서 로드에서만 유효하고,
// DOM에 나중에 삽입된 <script>는 브라우저가 실행하지 않는다). 루트 레이아웃은 모든
// 클라이언트 사이드 네비게이션에서 다시 마운트되지 않으므로(자식만 바뀐다), 이 Script를
// 루트 레이아웃 한 곳에만 두면 최초 로드 때 딱 한 번만 렌더링되어 이 문제가 근본적으로
// 사라진다. 대신 루트 레이아웃은 로그인 후 보호 페이지를 포함한 모든 경로를 감싸므로,
// 스크립트 자신이 현재 pathname을 보고 "대상 ja 페이지"일 때만 동작해야 한다.
//
// lib/locale-context.tsx가 쓰는 것과 같은 localStorage 키를 여기서도 직접 문자열로
// 확인한다(React Context가 하이드레이션되기 전에 실행돼야 해서 Context에 의존할 수
// 없다). 완전 신규 방문자(저장된 언어 선택 기록이 없는 경우)만 navigator.language/
// navigator.languages로 브라우저 언어를 봐서 한국어 짝 페이지로 보낼지 정한다.
//
// 로그인된 사용자의 user_metadata.language를 여기서 따로 조회하지 않는 이유: 대상
// 페이지들은 lib/supabase/proxy.ts가 로그인 사용자를 여기 도달하기 전에 이미
// /dashboard로 리다이렉트하므로(서버 단계), 이 스크립트가 실제로 동작하는 시점엔 항상
// 비로그인 상태만 존재한다 — 추가 인증 조회가 애초에 불필요하다.
const LOCALE_STORAGE_KEY = "jobcal:locale";

// 자동 감지 대상 ja 경로 → ko 짝 경로. 이 3개 페이지 자신에게 도달했을 때만 동작하고,
// 그 외 모든 경로(그 자신의 /ko 짝, forgot-password/update-password/auth/confirmed,
// 로그인 후 보호 페이지 등)에서는 아래 함수가 만드는 스크립트가 완전히 no-op이다.
const JA_TO_KO_PATH: Record<string, string> = {
  "/": "/ko",
  "/login": "/ko/login",
  "/signup": "/ko/signup",
};

export function buildBrowserLocaleRedirectScript(): string {
  return `(function(){try{var m=${JSON.stringify(JA_TO_KO_PATH)};var koPath=m[location.pathname];if(!koPath)return;var v=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});if(v==="ja")return;if(v==="ko"){location.replace(koPath);return;}var langs=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||""];if((langs[0]||"").toLowerCase().indexOf("ko")===0)location.replace(koPath);}catch(e){}})();`;
}
