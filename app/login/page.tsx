"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import { buildCheckoutNext, resolvePostAuthRedirect } from "@/lib/auth/nextPath";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthHeroPanel from "@/components/auth/AuthHeroPanel";
import AuthPillField from "@/components/auth/AuthPillField";
import GoogleIcon from "@/components/auth/GoogleIcon";
import MaterialIcon from "@/components/ui/MaterialIcon";

function mapSignInError(t: (key: string) => string, message: string): string {
  if (message.includes("Invalid login credentials")) {
    return t("auth.errors.invalidCredentials");
  }
  if (message.includes("Email not confirmed")) {
    return t("auth.errors.emailNotConfirmed");
  }
  return t("auth.errors.loginFailed");
}

// docs/stitch/인증플로우/jobcal_login_unified_auth_design_sync/screen.png 기준. 헤더/좌측
// 패널/우측 폼 스타일은 app/signup/page.tsx가 먼저 구현한 것과 시안상 완전히 동일해,
// components/auth/{AuthHeader,AuthHeroPanel,AuthPillField,GoogleIcon}로 분리해 공유한다
// (signup 자체 파일은 이번 범위에서 수정하지 않음). 공용 AuthLayout(다른 인증 페이지가
// 계속 쓰는 좌측 브랜딩 패널)은 이번 시안과 구조가 달라 그대로 두고 건드리지 않는다.
export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // 정적 프리렌더 결과는 쿼리스트링을 알 수 없어 항상 빈 문자열이다. 최초 렌더를 그 값과
  // 동일하게 유지해 hydration mismatch를 피하고, 마운트 이후에만 쿼리를 확인해 반영한다.
  const [errorMessage, setErrorMessage] = useState("");
  // /pricing?checkout=pro에서 비로그인 상태로 Pro CTA를 눌러 여기로 왔을 때 로그인 성공 후
  // 되돌아갈 경로. next/checkout이 없거나 안전하지 않으면 기존과 동일하게 "/dashboard"로
  // 남는다 — 결제 의도가 없는 일반 로그인은 동작이 전혀 바뀌지 않는다.
  const [redirectTarget, setRedirectTarget] = useState("/dashboard");
  // 계정이 없어 "新規登録" 링크로 /signup으로 넘어가는 사용자도 결제 의도를 잃지 않도록,
  // 지금 이 /login URL의 next/checkout을 하나의 next 값으로 합쳐 그대로 넘긴다. 의도가
  // 없거나 안전하지 않으면 기존과 동일하게 그냥 "/signup"으로 남는다.
  const [signupHref, setSignupHref] = useState("/signup");

  // URL 쿼리(외부 상태)와의 최초 동기화이며, 정적 프리렌더와의 hydration 일치를 위해
  // 의도적으로 마운트 후 처리한다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "confirm_failed") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage(t("auth.errors.confirmFailed"));
    }
    const checkoutNext = buildCheckoutNext(params.get("next"), params.get("checkout"));
    setRedirectTarget(
      resolvePostAuthRedirect(params.get("next"), params.get("checkout"), "/dashboard")
    );
    if (checkoutNext) setSignupHref(`/signup?next=${encodeURIComponent(checkoutNext)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleLogin() {
    setIsLoading(true);
    setErrorMessage("");

    // Google 로그인은 Supabase가 /auth/callback으로 직접 리다이렉트하므로, 결제 복귀
    // 의도(next=/pricing&checkout=pro)를 여기서 미리 하나의 next 값으로 합쳐 callback URL의
    // 쿼리로 실어 보낸다 — /auth/callback은 그 next 하나만 그대로 resolveNextPath로
    // 검증해 이동한다(해당 라우트 자체는 수정하지 않음).
    const params = new URLSearchParams(window.location.search);
    const checkoutNext = buildCheckoutNext(params.get("next"), params.get("checkout"));
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (checkoutNext) callbackUrl.searchParams.set("next", checkoutNext);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setErrorMessage(t("auth.errors.googleStartFailed"));
      setIsLoading(false);
    }
  }

  async function handleEmailLogin(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage(t("auth.errors.emailPasswordRequired"));
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(mapSignInError(t, error.message));
      setIsLoading(false);
      return;
    }

    router.push(redirectTarget);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
      <AuthHeader />

      <main className="flex min-h-screen items-center justify-center p-6 pt-24 md:p-12 md:pt-24">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-16 md:grid-cols-2 md:gap-24">
          <AuthHeroPanel />

          {/* 우측: 로그인 폼 */}
          <div className="mx-auto w-full max-w-[440px] md:mr-0 md:ml-auto">
            <div className="flex flex-col space-y-8">
              <div className="space-y-2 text-center">
                <h2 className="text-[32px] font-[400] tracking-tight text-neutral-900">
                  {t("auth.login.title")}
                </h2>
                <p className="text-[15px] text-neutral-600">{t("auth.login.description")}</p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-neutral-300 bg-white px-6 py-3.5 text-[15px] font-[400] text-neutral-900 transition-all duration-200 hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <MaterialIcon name="progress_activity" size={18} className="animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{isLoading ? t("auth.login.googleLoading") : t("auth.login.google")}</span>
              </button>

              <div className="relative flex items-center py-2">
                <div className="h-px flex-grow border-t border-neutral-200" />
                <span className="mx-4 shrink-0 text-[13px] text-neutral-600">
                  {t("auth.login.divider")}
                </span>
                <div className="h-px flex-grow border-t border-neutral-200" />
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-6">
                <AuthPillField
                  id="email"
                  type="email"
                  label={t("auth.login.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
                <AuthPillField
                  id="password"
                  type={showPassword ? "text" : "password"}
                  label={t("auth.login.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  labelSlot={
                    <Link
                      href="/forgot-password"
                      className="text-[13px] font-[400] text-primary-navy transition-colors hover:underline"
                    >
                      {t("auth.login.forgotPassword")}
                    </Link>
                  }
                  rightSlot={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
                      className="text-neutral-300 transition-colors hover:text-neutral-600"
                    >
                      <MaterialIcon name={showPassword ? "visibility" : "visibility_off"} size={20} />
                    </button>
                  }
                />

                {errorMessage && <p className="text-[13px] text-error">{errorMessage}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary-navy px-6 text-[15px] font-[400] text-white shadow-sm transition-colors hover:bg-[#152c6e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading && (
                    <MaterialIcon name="progress_activity" size={18} className="animate-spin" />
                  )}
                  {isLoading ? t("auth.login.submitLoading") : t("auth.login.submit")}
                </button>
              </form>

              <div className="pt-4 text-center">
                <p className="text-[14px] text-neutral-600">
                  {t("auth.login.signupPrompt")}{" "}
                  <Link href={signupHref} className="ml-1 font-[400] text-primary-navy hover:underline">
                    {t("auth.login.signupLink")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
