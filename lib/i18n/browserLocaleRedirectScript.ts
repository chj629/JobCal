// app/page.tsx, app/login/page.tsx, app/signup/page.tsx(모두 locked LocaleProvider, 일본어
// 기본)에서 <Script strategy="beforeInteractive">에 그대로 넣을 스크립트 문자열을 만든다.
// @next/eslint-plugin-next의 no-before-interactive-script-outside-document 규칙이
// "app/ 디렉터리 안의 파일인지"만 파일 경로로 판단하므로(App Router 자체를 인식하지
// 못함), <Script> JSX는 반드시 각 app/*.tsx 파일 안에서 직접 렌더링해야 경고가 없다 —
// 그래서 JSX가 아니라 문자열 생성 로직만 여기서 공유한다.
//
// lib/locale-context.tsx가 쓰는 것과 같은 localStorage 키를 여기서도 직접 문자열로
// 확인한다(React Context가 하이드레이션되기 전에 실행돼야 해서 Context에 의존할 수
// 없다). 완전 신규 방문자(저장된 언어 선택 기록이 없는 경우)만 navigator.language/
// navigator.languages로 브라우저 언어를 봐서 한국어 짝 페이지(koPath)로 보낼지 정한다.
//
// 로그인된 사용자의 user_metadata.language를 여기서 따로 조회하지 않는 이유: 이
// 페이지들은 lib/supabase/proxy.ts가 로그인 사용자를 여기 도달하기 전에 이미
// /dashboard로 리다이렉트하므로(서버 단계), 이 스크립트가 실행되는 시점엔 항상
// 비로그인 상태만 존재한다 — 추가 인증 조회가 애초에 불필요하다.
const LOCALE_STORAGE_KEY = "jobcal:locale";

export function buildBrowserLocaleRedirectScript(koPath: string): string {
  return `(function(){try{var v=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});if(v==="ja")return;if(v==="ko"){location.replace(${JSON.stringify(koPath)});return;}var langs=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||""];if((langs[0]||"").toLowerCase().indexOf("ko")===0)location.replace(${JSON.stringify(koPath)});}catch(e){}})();`;
}
