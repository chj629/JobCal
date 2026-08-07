"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import AuthLayout from "@/components/auth/AuthLayout";

export default function AuthConfirmedPage() {
  const router = useRouter();
  const t = useT();
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoToLogin() {
    setIsLoading(true);

    // verifyOtp() 성공 시 세션이 이미 생성되어 있으므로, 로그인 화면이 정상적으로
    // 뜨도록(proxy.ts가 로그인 상태의 /login 접근을 /로 되돌리지 않도록) 먼저 로그아웃한다.
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error && process.env.NODE_ENV === "development") {
      console.error("[auth/confirmed] signOut 실패:", {
        status: error.status,
        code: error.code,
        message: error.message,
        name: error.name,
      });
    }

    // 뒤로가기로 이 페이지에 다시 돌아오지 않도록 push 대신 replace를 사용한다.
    router.replace("/login");
    router.refresh();
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8 text-center">
        <h1 className="text-[28px] font-semibold text-foreground">
          {t("auth.confirmed.title")}
        </h1>
        <p className="mt-4 text-sm text-secondary">
          {t("auth.confirmed.messageLine1")}
          <br />
          {t("auth.confirmed.messageLine2")}
          <br />
          {t("auth.confirmed.messageLine3")}
        </p>

        <button
          type="button"
          onClick={handleGoToLogin}
          disabled={isLoading}
          className="mt-8 h-10 w-full rounded-[10px] bg-primary text-sm font-medium text-white disabled:opacity-60"
        >
          {isLoading ? t("auth.confirmed.buttonLoading") : t("auth.confirmed.button")}
        </button>
      </div>
    </AuthLayout>
  );
}
