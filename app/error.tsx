"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/locale-context";
import { toPublicPageHref } from "@/lib/i18n/publicLocalePaths";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Next.js App Router 규약상 error.tsx는 항상 클라이언트 컴포넌트여야 한다.
// 기존 에러 핸들링 로직은 건드리지 않고, 잡히지 않은 렌더링 에러에 대한
// 최소한의 JobCal 스타일 대체 화면만 제공한다.
//
// 에러가 난 페이지 자신의 LocaleProvider(예: /ko/* 공개 페이지의 locked Provider)는
// 렌더링에 실패한 서브트리와 함께 언마운트되므로, 이 화면은 root layout의(잠기지 않은)
// 바깥쪽 Provider만 볼 수 있어 그 값만으로는 "/ko/*에서 에러가 났다"를 알 수 없다.
// 대신 App Router 자체의 라우팅 컨텍스트(usePathname)는 에러 바운더리 밖에서 계속
// 살아있으므로 안전하게 재사용할 수 있다 — lib/i18n/publicLocalePaths.ts가 이미 같은
// 방식으로 URL만 보고 ja/ko를 판별하고 있어 그 유틸을 그대로 쓴다.
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useT();
  const pathname = usePathname();
  const isKoPath = pathname === "/ko" || pathname.startsWith("/ko/");
  const homeHref = toPublicPageHref(isKoPath ? "ko" : "ja", "/");

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[app/error]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-16">
      <Logo size="lg" />
      <EmptyState
        icon="error"
        title={t("errorPages.error.title")}
        description={t("errorPages.error.description")}
      />
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={() => (window.location.href = homeHref)}>
          {t("errorPages.error.homeAction")}
        </Button>
        <Button type="button" variant="primary" onClick={reset}>
          {t("errorPages.error.retryAction")}
        </Button>
      </div>
    </div>
  );
}
