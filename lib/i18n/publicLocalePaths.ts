"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n/messages";

// 공개 페이지(랜딩 + pricing/terms/privacy/refund-policy/tokushoho/contact) 전용 규칙.
// 이 페이지들은 항상 "/xxx"(일본어) ↔ "/ko/xxx"(한국어) 대칭 구조를 가진다 — /login,
// /signup 등 /ko 짝이 없는 라우트에는 이 유틸을 쓰지 않는다.

// 고정된 일본어 경로(jaPath)를 현재 locale에 맞는 실제 URL로 바꾼다. 페이지 내부에서
// 다른 공개 페이지로 거는 링크(footer, pricing 정책 링크, legal 문서 간 상호 링크 등)에 쓴다.
export function toPublicPageHref(locale: Locale, jaPath: string): string {
  if (locale !== "ko") return jaPath;
  return jaPath === "/" ? "/ko" : `/ko${jaPath}`;
}

// 현재 pathname에서 "/ko" 접두사를 뗀 일본어 기준 경로를 구한다.
function toJaPath(pathname: string): string {
  const isKo = pathname === "/ko" || pathname.startsWith("/ko/");
  return isKo ? pathname.slice(3) || "/" : pathname;
}

// 지금 보고 있는 공개 페이지의 ja/ko 짝 URL(LanguageSwitcher가 이동할 대상)을 URL
// 자체로부터 계산한다 — 페이지마다 매핑을 따로 넘길 필요가 없다.
export function usePublicPageLanguageHrefs(): Record<Locale, string> {
  const jaPath = toJaPath(usePathname());
  return { ja: jaPath, ko: toPublicPageHref("ko", jaPath) };
}

// SiteHeader 로고 등 "이 공개 페이지의 홈"으로 보낼 링크 — 현재 locale이 ko면 /ko,
// 아니면 /.
export function usePublicHomeHref(): string {
  const { locale } = useLocale();
  return toPublicPageHref(locale, "/");
}
