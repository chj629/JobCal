"use client";

import { useEffect } from "react";
import { useT } from "@/lib/locale-context";
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
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useT();

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
        <Button type="button" variant="secondary" onClick={() => (window.location.href = "/")}>
          {t("errorPages.error.homeAction")}
        </Button>
        <Button type="button" variant="primary" onClick={reset}>
          {t("errorPages.error.retryAction")}
        </Button>
      </div>
    </div>
  );
}
