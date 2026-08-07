"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { useT } from "@/lib/locale-context";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

// 로그인 여부와 무관하게 항상 안전한 "/"(공개 Landing)로 돌려보낸다.
// 로그인 상태라면 사이드바 내비게이션으로 원하는 화면으로 다시 이동할 수 있다.
export default function NotFound() {
  const t = useT();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-16">
      <Logo size="lg" />
      <EmptyState
        icon={FileQuestion}
        title={t("errorPages.notFound.title")}
        description={t("errorPages.notFound.description")}
      />
      <Link href="/">
        <Button type="button" variant="primary">
          {t("errorPages.notFound.action")}
        </Button>
      </Link>
    </div>
  );
}
