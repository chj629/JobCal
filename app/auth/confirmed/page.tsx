"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthHeroPanel from "@/components/auth/AuthHeroPanel";
import MaterialIcon from "@/components/ui/MaterialIcon";

// docs/stitch/인증플로우/jobcal_password_changed_unified_auth_design_sync/screen.png 기준.
// 이 배치에는 "이메일 인증 완료" 전용 시안이 따로 없어, 구조가 동일한(체크 아이콘 +
// 제목 + 설명 + 버튼 1개) "비밀번호 재설정 완료" 시안을 그대로 템플릿으로 재사용한다.
// 문구 자체는 이 화면 고유의 이메일 인증 완료 내용(auth.confirmed.*, 기존 키 그대로)을
// 유지한다. 헤더/좌측 패널은 다른 인증 화면과 동일한 공용 컴포넌트를 재사용한다.
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
    <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
      <AuthHeader />

      <main className="flex min-h-screen items-center justify-center p-6 pt-24 md:p-12 md:pt-24">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-16 md:grid-cols-2 md:gap-24">
          <AuthHeroPanel />

          {/* 우측: 완료 안내 */}
          <div className="mx-auto w-full max-w-[440px] md:mr-0 md:ml-auto">
            <div className="space-y-6 py-4 text-center">
              <div className="flex justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dbeafe]/50 text-primary-navy">
                  <MaterialIcon name="check_circle" size={40} filled />
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-[32px] font-[400] tracking-tight text-neutral-900">
                  {t("auth.confirmed.title")}
                </h2>
                <p className="text-[15px] leading-[1.5] text-neutral-600">
                  {t("auth.confirmed.messageLine1")}
                  <br />
                  {t("auth.confirmed.messageLine2")}
                  <br />
                  {t("auth.confirmed.messageLine3")}
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoToLogin}
                disabled={isLoading}
                className="mt-4 h-[52px] w-full rounded-full bg-primary-navy px-6 text-[15px] font-[400] text-white shadow-sm transition-colors hover:bg-[#152c6e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? t("auth.confirmed.buttonLoading") : t("auth.confirmed.button")}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
