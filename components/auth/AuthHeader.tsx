"use client";

import SiteHeader from "@/components/ui/SiteHeader";
import { usePublicHomeHref, usePublicPageLanguageHrefs } from "@/lib/i18n/publicLocalePaths";

// docs/stitch/인증플로우/*의 고정 상단 헤더(JobCal 워드마크 + 언어 전환). 헤더 셸 전체(높이/
// 좌우 padding/max-width/로고 크기·위치/언어 전환 위치/border)를 components/ui/SiteHeader.tsx가
// 직접 관리하며 랜딩 페이지(LandingNav)와 공유한다 — 언어 전환은 SiteHeader가 항상 맨
// 오른쪽에 자체적으로 렌더링하므로 여기서 따로 넘길 children이 없다.
//
// /login, /signup, /forgot-password, /update-password가 각각 /ko/* 짝을 갖게 되면서,
// legal 페이지(components/legal/LegalPageShell.tsx)와 동일하게 언어 전환 대상 URL과
// 로고 홈 링크를 현재 URL로부터 자동 계산해 SiteHeader에 넘긴다 — 페이지마다 매핑을
// 따로 넘길 필요가 없다.
export default function AuthHeader() {
  const languageHrefs = usePublicPageLanguageHrefs();
  const homeHref = usePublicHomeHref();

  return <SiteHeader languageHrefs={languageHrefs} homeHref={homeHref} />;
}
