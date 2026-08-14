"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthHeroPanel from "@/components/auth/AuthHeroPanel";
import AuthPillField from "@/components/auth/AuthPillField";
import MaterialIcon from "@/components/ui/MaterialIcon";

const MIN_PASSWORD_LENGTH = 6;

type SessionStatus = "checking" | "ready" | "invalid";

// docs/stitch/인증플로우/jobcal_reset_password_unified_auth_design_sync/screen.png 기준.
// 헤더/좌측 패널/폼 폭/입력창/버튼 스타일은 /login, /signup, /forgot-password와 동일해 같은
// components/auth/{AuthHeader,AuthHeroPanel,AuthPillField}를 그대로 재사용한다(다른 인증
// 페이지는 이번 범위에서 수정하지 않음). Google 로그인/구분선 없이 새 비밀번호 2개 필드만
// 있는 구성이 이 화면 고유 특징이다. checking/invalid 상태는 대응하는 screen.png가 없어
// signup의 이메일 발송완료 화면과 동일한 방식(가운데 정렬, 박스 없이, 새 톤)으로만 맞춘다.
export default function UpdatePasswordPage() {
  const router = useRouter();
  const t = useT();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 세션 존재 여부는 서버 프리렌더에서 알 수 없으므로 "checking" 상태로 시작해
  // hydration mismatch를 피하고, 마운트 이후에만 실제 세션을 확인한다.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSessionStatus(user ? "ready" : "invalid");
    });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (!password || !confirmPassword) {
      setErrorMessage(t("auth.errors.allFieldsRequired"));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(t("auth.errors.passwordMinLength", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t("auth.errors.passwordMismatch"));
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(t("auth.errors.updateFailed"));
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
      <AuthHeader />

      <main className="flex min-h-screen items-center justify-center p-6 pt-24 md:p-12 md:pt-24">
        {sessionStatus === "checking" && (
          <p className="text-[15px] text-neutral-600">{t("auth.updatePassword.checking")}</p>
        )}

        {sessionStatus === "invalid" && (
          <div className="w-full max-w-[440px] space-y-4 text-center">
            <h1 className="text-[32px] leading-[1.1] font-[400] tracking-tight text-neutral-900">
              {t("auth.updatePassword.invalidTitle")}
            </h1>
            <p className="text-[15px] leading-[1.5] text-neutral-600">
              {t("auth.updatePassword.invalidMessage")}
            </p>
            <Link
              href="/forgot-password"
              className="inline-block pt-4 text-[14px] font-[400] text-primary-navy hover:underline"
            >
              {t("auth.updatePassword.requestNewLink")}
            </Link>
          </div>
        )}

        {sessionStatus === "ready" && (
          <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-16 md:grid-cols-2 md:gap-24">
            <AuthHeroPanel />

            {/* 우측: 새 비밀번호 설정 폼 */}
            <div className="mx-auto w-full max-w-[440px] md:mr-0 md:ml-auto">
              <div className="flex flex-col space-y-8">
                <div className="space-y-2 text-center">
                  <h2 className="text-[32px] font-[400] tracking-tight text-neutral-900">
                    {t("auth.updatePassword.title")}
                  </h2>
                  <p className="text-[15px] text-neutral-600">
                    {t("auth.updatePassword.description")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <AuthPillField
                    id="new_password"
                    type={showPassword ? "text" : "password"}
                    label={t("auth.updatePassword.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
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
                  <AuthPillField
                    id="new_password_confirmation"
                    type={showConfirmPassword ? "text" : "password"}
                    label={t("auth.updatePassword.confirmPassword")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    rightSlot={
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={
                          showConfirmPassword ? t("common.hidePassword") : t("common.showPassword")
                        }
                        className="text-neutral-300 transition-colors hover:text-neutral-600"
                      >
                        <MaterialIcon
                          name={showConfirmPassword ? "visibility" : "visibility_off"}
                          size={20}
                        />
                      </button>
                    }
                  />

                  {errorMessage && <p className="text-[13px] text-error">{errorMessage}</p>}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-4 h-[52px] w-full rounded-full bg-primary-navy px-6 text-[15px] font-[400] text-white shadow-sm transition-colors hover:bg-[#152c6e] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? t("auth.updatePassword.submitLoading") : t("auth.updatePassword.submit")}
                  </button>
                </form>

                <div className="pt-4 text-center">
                  <Link href="/login" className="text-[14px] font-[400] text-primary-navy hover:underline">
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
