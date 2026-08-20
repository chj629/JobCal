import type { MetadataRoute } from "next";

// 실제 검색 노출이 필요한 공개 페이지만 포함한다(Landing/Privacy/Terms/Contact).
// 로그인/가입 등은 app/robots.ts에서 제외 대상이라 여기서도 넣지 않는다.
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://jobcal.app";

  return [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/tokushoho`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/refund-policy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
