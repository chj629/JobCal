import type { Metadata } from "next";
import { translate } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/messages";

const SITE_URL = "https://jobcal.app";
const SITE_TITLE = "JobCal";

// 공개 페이지(랜딩 + pricing/terms/privacy/refund-policy/tokushoho/contact) 6종이 공유하는
// 최소 공통 metadata 빌더. title/description은 새로 짓지 않고 messages/ja.json·ko.json의
// 기존 번역(translate)만 재사용한다.
//
// og:image/twitter:image는 이 페이지들이 직접 만들지 않는다 — app/opengraph-image.tsx(ja)·
// app/ko/opengraph-image.tsx(ko)가 이미 만들어 둔 이미지를 그대로 가리키기만 한다. Next.js는
// 페이지가 자기 openGraph를 명시적으로 지정하면(이 함수처럼 title/url 등을 채워야 하므로
// 불가피하다) 그 순간부터 상위 세그먼트(app/opengraph-image.tsx)의 파일 컨벤션 자동
// 상속을 더 이상 적용하지 않는다 — 그래서 images를 비워두면 og:image가 아예 사라진다
// (실제로 재현·확인함). "OG 이미지는 새로 만들지 않는다"는 제약을 지키면서 이 문제를
// 피하려면 기존 두 이미지 라우트를 이렇게 명시적으로 재참조하는 것이 유일한 방법이다.
export function buildPublicPageMetadata(options: {
  locale: Locale;
  jaPath: string; // "/terms", "/pricing" 등 — 일본어 기준 경로
  titleKey: string;
  descriptionKey: string;
}): Metadata {
  const { locale, jaPath, titleKey, descriptionKey } = options;
  const koPath = jaPath === "/" ? "/ko" : `/ko${jaPath}`;
  const path = locale === "ko" ? koPath : jaPath;
  const title = `${translate(locale, titleKey)} | ${SITE_TITLE}`;
  const description = translate(locale, descriptionKey);
  const ogImagePath = locale === "ko" ? "/ko/opengraph-image" : "/opengraph-image";

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: {
        ja: `${SITE_URL}${jaPath}`,
        ko: `${SITE_URL}${koPath}`,
      },
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_TITLE,
      locale: locale === "ko" ? "ko_KR" : "ja_JP",
      type: "website",
      images: [ogImagePath],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  };
}
