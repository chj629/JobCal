"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLocale, useT } from "@/lib/locale-context";
import { toPublicPageHref } from "@/lib/i18n/publicLocalePaths";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthHeroPanel from "@/components/auth/AuthHeroPanel";
import AuthPillField from "@/components/auth/AuthPillField";

// app/forgot-password/page.tsx(ja)와 app/ko/forgot-password/page.tsx(ko)가 공유하는 실제
// 페이지 본문 — 두 라우트 모두 이 컴포넌트를 그대로 렌더링하고, 감싸는
// LocaleProvider(locked)의 initialLocale만 다르다. 본문을 언어별로 복제하지 않는다.
// resetPasswordForEmail의 redirectTo가 현재 locale의 /update-password를 가리키도록
// 하고, /login으로 가는 내부 링크도 현재 locale에 맞춰 /ko/*로 이동하도록 고쳤다.
//
// docs/stitch/인증플로우/jobcal_forgot_password_unified_auth_design_sync/screen.png 기준.
// 헤더/좌측 패널/폼 폭/입력창/버튼 스타일은 /login, /signup과 동일해 같은
// components/auth/{AuthHeader,AuthHeroPanel,AuthPillField}를 그대로 재사용한다
// (/signup, /login, /update-password는 이번 범위에서 수정하지 않음). Google 로그인/구분선이
// 없는 단일 이메일 폼이라는 점만 이 화면 고유 구성이다.
export default function ForgotPasswordPageContent() {
  const t = useT();
  const { locale } = useLocale();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sent, setSent] = useState(false);

  // URL 쿼리(외부 상태)와의 최초 동기화이며, 정적 프리렌더와의 hydration 일치를 위해
  // 의도적으로 마운트 후 처리한다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "reset_failed") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage(t("auth.errors.resetFailed"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage(t("auth.errors.emailRequired"));
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    // redirectTo가 곧 app/auth/confirm/route.ts가 받는 next 값이 된다(resolveNextPath로
    // 검증됨) — 현재 locale의 /update-password로 보내야 재설정 화면도 같은 언어로 뜬다.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${toPublicPageHref(locale, "/update-password")}`,
    });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        // 이메일 주소 등 민감 정보는 남기지 않고 에러 자체의 진단 정보만 출력한다.
        console.error("[forgot-password] resetPasswordForEmail 실패:", {
          status: error.status,
          code: error.code,
          message: error.message,
          name: error.name,
        });
      }
      setErrorMessage(t("auth.errors.resetSendFailed"));
      setIsLoading(false);
      return;
    }

    setSent(true);
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
      <AuthHeader />

      <main className="flex min-h-screen items-center justify-center p-6 pt-24 md:p-12 md:pt-24">
        {sent ? (
          <div className="w-full max-w-[440px] space-y-4 text-center">
            <h1 className="text-[32px] leading-[1.1] font-[400] tracking-tight text-neutral-900">
              {t("auth.forgotPassword.sentTitle")}
            </h1>
            <p className="text-[15px] leading-[1.5] text-neutral-600">
              {t("auth.forgotPassword.sentMessage", { email })}
            </p>
            <Link
              href={toPublicPageHref(locale, "/login")}
              className="inline-block pt-4 text-[14px] font-[400] text-primary-navy hover:underline"
            >
              {t("auth.forgotPassword.backToLoginFromSent")}
            </Link>
          </div>
        ) : (
          <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-16 md:grid-cols-2 md:gap-24">
            <AuthHeroPanel />

            {/* 우측: 비밀번호 재설정 요청 폼 */}
            <div className="mx-auto w-full max-w-[440px] md:mr-0 md:ml-auto">
              <div className="flex flex-col space-y-8">
                <div className="space-y-2 text-center">
                  <h2 className="text-[32px] font-[400] tracking-tight text-neutral-900">
                    {t("auth.forgotPassword.title")}
                  </h2>
                  <p className="text-[15px] text-neutral-600">
                    {t("auth.forgotPassword.description")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <AuthPillField
                    id="email"
                    type="email"
                    label={t("auth.forgotPassword.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />

                  {errorMessage && <p className="text-[13px] text-error">{errorMessage}</p>}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-4 h-[52px] w-full rounded-full bg-primary-navy px-6 text-[15px] font-[400] text-white shadow-sm transition-colors hover:bg-[#152c6e] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? t("auth.forgotPassword.submitLoading") : t("auth.forgotPassword.submit")}
                  </button>
                </form>

                <div className="pt-4 text-center">
                  <Link
                    href={toPublicPageHref(locale, "/login")}
                    className="text-[14px] font-[400] text-primary-navy hover:underline"
                  >
                    {t("auth.forgotPassword.backToLogin")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
