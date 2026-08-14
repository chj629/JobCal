"use client";

import SiteHeader from "@/components/ui/SiteHeader";

// docs/stitch/인증플로우/*의 고정 상단 헤더(JobCal 워드마크 + 언어 전환). 헤더 셸 전체(높이/
// 좌우 padding/max-width/로고 크기·위치/언어 전환 위치/border)를 components/ui/SiteHeader.tsx가
// 직접 관리하며 랜딩 페이지(LandingNav)와 공유한다 — 언어 전환은 SiteHeader가 항상 맨
// 오른쪽에 자체적으로 렌더링하므로 여기서 따로 넘길 children이 없다.
export default function AuthHeader() {
  return <SiteHeader />;
}
