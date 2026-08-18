import type { MetadataRoute } from "next";

// 로그인/가입/비밀번호 재설정 등 검색 노출이 불필요한 화면과, 실제 로그인이 필요한
// (app) 라우트 그룹 5개 화면 + API 라우트는 크롤링 대상에서 제외한다. 공개 콘텐츠(Landing,
// Privacy, Terms, Contact)만 노출한다.
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
