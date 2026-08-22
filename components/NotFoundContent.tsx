"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { translate } from "@/lib/i18n/translate";
import { toPublicPageHref } from "@/lib/i18n/publicLocalePaths";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

// Next.js는 존재하지 않는 URL에 대해 app/not-found.tsx(루트) 하나만 렌더링한다 —
// app/ko/not-found.tsx처럼 세그먼트별 not-found 파일을 따로 둬도 next build의 라우트
// 목록에는 "/_not-found" 하나만 나오고, /ko/* 하위의 임의 URL에도 그 파일은 전혀 쓰이지
// 않음을 실제 빌드로 확인했다(그래서 만들지 않았다). 이 화면이 유일한 진입점이라
// 페이지 자신의 LocaleProvider가 없으므로, app/error.tsx와 동일하게 usePathname()으로
// /ko/* 여부만 보고 판단한다. 이 화면만을 위해 별도 LocaleProvider 트리를 새로 만드는
// 대신, 이미 서버 metadata 등에서도 Context 없이 쓰이는 translate()를 그대로 불러
// 텍스트/링크를 계산한다 — 로그인 여부와 무관하게 항상 안전한 홈(ja면 "/", ko면
// "/ko")으로 돌려보낸다.
export default function NotFoundContent() {
  const pathname = usePathname();
  const locale = pathname === "/ko" || pathname.startsWith("/ko/") ? "ko" : "ja";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-16">
      <Logo size="lg" />
      <EmptyState
        icon="search_off"
        title={translate(locale, "errorPages.notFound.title")}
        description={translate(locale, "errorPages.notFound.description")}
      />
      <Link href={toPublicPageHref(locale, "/")}>
        <Button type="button" variant="primary">
          {translate(locale, "errorPages.notFound.action")}
        </Button>
      </Link>
    </div>
  );
}
