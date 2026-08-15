// app/auth/callback와 app/auth/confirm이 공유하는 next 경로 검증. 로그인/인증 이후
// 리다이렉트할 경로가 앱 내부("/"로 시작하고 "//"나 "://"를 포함하지 않는 값)만
// 가리키도록 강제해 오픈 리다이렉트를 막는다.
export function resolveNextPath(rawNext: string | null, fallback: string): string {
  if (!rawNext) return fallback;
  if (!rawNext.startsWith("/")) return fallback;
  if (rawNext.startsWith("//")) return fallback;
  if (rawNext.includes("://")) return fallback;
  return rawNext;
}
