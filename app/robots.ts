import type { MetadataRoute } from "next";

// 로그인/가입/비밀번호 재설정 등 검색 노출이 불필요한 화면과, 실제 로그인이 필요한
// (app) 라우트 그룹 5개 화면 + API 라우트는 크롤링 대상에서 제외한다. 공개 콘텐츠(Landing,
// Privacy, Terms, Contact)만 노출한다. /login·/signup·/forgot-password·/update-password의
// /ko 짝도 같은 이유로 동일하게 제외한다 — sitemap에는 auth 페이지를 애초에 넣지 않으므로
// 여기서 막는 게 이 페이지들이 색인되지 않게 하는 유일한 장치다. "/auth/"는
// /auth/confirmed·/auth/confirm·/auth/callback을 이미 다 막지만, /ko/auth/confirmed는
// 접두사가 달라 별도로 "/ko/auth/"를 추가해야 한다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/signup",
        "/forgot-password",
        "/update-password",
        "/auth/",
        "/ko/login",
        "/ko/signup",
        "/ko/forgot-password",
        "/ko/update-password",
        "/ko/auth/",
        "/dashboard",
        "/companies",
        "/calendar",
        "/analytics",
        "/settings",
        "/api/",
      ],
    },
    sitemap: "https://jobcal.app/sitemap.xml",
  };
}
