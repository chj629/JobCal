"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import { buildCheckoutNext, resolvePostAuthRedirect } from "@/lib/auth/nextPath";
import AuthHeader from "@/components/auth/AuthHeader";
import MaterialIcon from "@/components/ui/MaterialIcon";

const MIN_PASSWORD_LENGTH = 6;
const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 30;

const HERO_FEATURES = [
  { icon: "business_center", key: "auth.signup.heroFeature1" },
  { icon: "calendar_today", key: "auth.signup.heroFeature2" },
  { icon: "auto_awesome", key: "auth.signup.heroFeature3" },
] as const;

function mapSignUpError(t: (key: string) => string, message: string): string {
  if (message.toLowerCase().includes("already registered")) {
    return t("auth.errors.alreadyRegistered");
  }
  return t("auth.errors.signupFailed");
}

// docs/stitch/인증플로우/jobcal_sign_up_refined_visual_balance/screen.png 기준.
// 공용 AuthLayout(로그인/비밀번호 찾기/재설정이 함께 쓰는 좌측 브랜딩 패널)은 이번
// 시안과 헤더/좌측 패널 구조가 상당히 달라, 다른 인증 페이지에 영향을 주지 않도록
// AuthLayout을 고치지 않고 이 페이지 안에서만 로컬 마크업으로 재현한다(다른 인증
// 페이지는 이번 범위에서 수정하지 않음).
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
        fill="#4285F4"
      />
      <path
        d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
        fill="#EA4335"
      />
    </svg>
  );
}

// screen.png의 pill 입력창(label + rounded-full input, 필요시 우측 눈 아이콘). 공용
// Input(components/ui/Input.tsx)은 좌측 아이콘 + rounded-lg 스타일이라 이 화면과 달라
// 전역 컴포넌트는 바꾸지 않고 이 페이지 전용 로컬 마크업으로 처리한다.
function SignupField({
  id,
  label,
  rightSlot,
  ...props
}: {
  id: string;
  label: string;
  rightSlot?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[14px] font-[400] text-neutral-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="w-full rounded-full border border-neutral-300 bg-white px-5 py-3.5 text-[15px] text-neutral-900 placeholder:text-neutral-300 transition-all focus:border-primary-navy focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
          {...props}
        />
        {rightSlot && (
          <div className="absolute top-1/2 right-5 flex -translate-y-1/2 items-center">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);
  // /pricing?checkout=pro에서 비로그인 상태로 Pro CTA를 눌러 여기로 왔을 때, 가입 즉시
  // 세션이 발급되는 경우(이메일 확인이 꺼져 있거나 Google 가입) 돌아갈 경로. next/checkout이
  // 없거나 안전하지 않으면 기존과 동일하게 "/dashboard"로 남는다 — 결제 의도가 없는 일반
  // 회원가입은 동작이 전혀 바뀌지 않는다.
  const [redirectTarget, setRedirectTarget] = useState("/dashboard");
  // 이미 계정이 있어 "ログイン" 링크로 /login으로 넘어가는 사용자도 결제 의도를 잃지
  // 않도록, 지금 이 /signup URL의 next/checkout을 하나의 next 값으로 합쳐 그대로 넘긴다.
  // 의도가 없거나 안전하지 않으면 기존과 동일하게 그냥 "/login"으로 남는다.
  const [loginHref, setLoginHref] = useState("/login");

  // app/login/page.tsx와 동일한 이유로 마운트 후에만 쿼리를 읽는다(정적 프리렌더와의
  // hydration 일치).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutNext = buildCheckoutNext(params.get("next"), params.get("checkout"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRedirectTarget(
      resolvePostAuthRedirect(params.get("next"), params.get("checkout"), "/dashboard")
    );
    if (checkoutNext) setLoginHref(`/login?next=${encodeURIComponent(checkoutNext)}`);
  }, []);

  // 기존 로그인 페이지(app/login/page.tsx)의 handleGoogleLogin과 동일한 Supabase
  // OAuth 로직. 회원가입/로그인 모두 같은 Google 계정 흐름을 타므로 로직은 그대로,
  // 버튼 문구만 signup 전용 키를 쓴다. next/checkout을 /auth/callback으로 넘기는 방식도
  // 로그인 페이지와 동일하다.
  async function handleGoogleSignup() {
    setIsGoogleLoading(true);
    setErrorMessage("");

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
      setIsGoogleLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setErrorMessage(t("auth.errors.allFieldsRequired"));
      return;
    }
    if (name.trim().length < MIN_NAME_LENGTH || name.trim().length > MAX_NAME_LENGTH) {
      setErrorMessage(
        t("auth.errors.nameLength", { min: MIN_NAME_LENGTH, max: MAX_NAME_LENGTH })
      );
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

    // 이메일 확인 링크(/auth/confirm)가 나중에 실제로 클릭되는 시점은 이 페이지가 이미
    // 사라진 뒤이므로, checkout 의도(next=/pricing&checkout=pro)를 지금 하나의 next 값으로
    // 합쳐 emailRedirectTo 쿼리에 실어 보낸다 — Google 가입(handleGoogleSignup)의
    // /auth/callback?next=... 과 동일한 패턴이다. /auth/confirm → /auth/confirmed →
    // /login까지 이 next 하나만 그대로 전달되고, 각 단계는 lib/auth/nextPath.ts의 안전
    // 검증을 다시 거친다(아래 /auth/confirm, /auth/confirmed 참고).
    const params = new URLSearchParams(window.location.search);
    const checkoutNext = buildCheckoutNext(params.get("next"), params.get("checkout"));
    const emailRedirectUrl = new URL("/auth/confirm", window.location.origin);
    if (checkoutNext) emailRedirectUrl.searchParams.set("next", checkoutNext);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: emailRedirectUrl.toString(),
        data: {
          display_name: name.trim(),
        },
      },
    });

    if (error) {
      setErrorMessage(mapSignUpError(t, error.message));
      setIsLoading(false);
      return;
    }

    // 이메일 확인이 꺼져 있는 프로젝트는 signUp() 즉시 세션이 발급된다.
    if (data.session) {
      router.push(redirectTarget);
      router.refresh();
      return;
    }

    // 이 프로젝트처럼 Confirm email이 켜진 상태에서 이미 가입(확인 완료)된 이메일로
    // signUp()을 다시 호출하면 Supabase는 에러를 던지지 않고 "obfuscated/fake user" 객체를
    // 돌려준다 — 사용자 열거를 막기 위한 Supabase 자체 설계다(공식 SDK 문서: "an
    // obfuscated/fake user object is returned"). 그래서 위 mapSignUpError(error.message
    // 기반)만으로는 이 경우를 못 잡는다. 신규 가입과 구분할 수 있는 유일한 공식 신호는
    // identities 배열뿐이다 — 신규 가입은 방금 만든 identity 1개를 포함하고, 이미 가입된
    // 이메일(이메일/비밀번호로 가입했든 Google로만 가입했든 동일)은 identities가 빈
    // 배열로 온다. DB를 별도로 조회하지 않고 이 signUp() 응답 자체의 신호만으로 판별한다.
    if (data.user && data.user.identities?.length === 0) {
      setErrorMessage(t("auth.errors.alreadyRegistered"));
      setIsLoading(false);
      return;
    }

    setConfirmationSent(true);
    setIsLoading(false);
  }

  const busy = isLoading || isGoogleLoading;

  return (
    <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
      <AuthHeader />

      <main className="flex min-h-screen items-center justify-center p-6 pt-24 md:p-12 md:pt-24">
        {confirmationSent ? (
          <div className="w-full max-w-[440px] space-y-4 text-center">
            <h1 className="text-[32px] leading-[1.1] font-[400] tracking-tight text-neutral-900">
              {t("auth.signup.confirmedTitle")}
            </h1>
            <p className="text-[15px] leading-[1.5] text-neutral-600">
              {t("auth.signup.confirmedMessage", { email })}
            </p>
            <Link
              href="/login"
              className="inline-block pt-4 text-[14px] font-[400] text-primary-navy hover:underline"
            >
              {t("auth.signup.backToLogin")}
            </Link>
          </div>
        ) : (
          <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-16 md:grid-cols-2 md:gap-24">
            {/* 좌측: 제품 메시지 */}
            <div className="flex flex-col space-y-8 pr-0 md:pr-8">
              <div className="space-y-6">
                <h1 className="max-w-lg text-[32px] leading-[1.1] font-[400] tracking-tight whitespace-pre-line text-neutral-900 md:text-[48px]">
                  {t("auth.signup.heroTitle")}
                </h1>
                <p className="max-w-lg text-[16px] leading-[1.5] whitespace-pre-line text-neutral-600">
                  {t("auth.signup.heroDescription")}
                </p>
              </div>
              <ul className="space-y-4">
                {HERO_FEATURES.map(({ icon, key }) => (
                  <li key={key} className="flex items-center gap-4 text-neutral-600">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dbeafe]/50 text-primary-navy">
                      <MaterialIcon name={icon} size={16} />
                    </span>
                    <span className="text-[15px]">{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 우측: 회원가입 폼 */}
            <div className="mx-auto w-full max-w-[440px] md:mr-0 md:ml-auto">
              <div className="flex flex-col space-y-8">
                <div className="space-y-2 text-center">
                  <h2 className="text-[32px] font-[400] tracking-tight text-neutral-900">
                    {t("auth.signup.title")}
                  </h2>
                  <p className="text-[15px] text-neutral-600">{t("auth.signup.description")}</p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-neutral-300 bg-white px-6 py-3.5 text-[15px] font-[400] text-neutral-900 transition-all duration-200 hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <MaterialIcon name="progress_activity" size={18} className="animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>{isGoogleLoading ? t("auth.signup.googleLoading") : t("auth.signup.google")}</span>
                </button>

                <div className="relative flex items-center py-2">
                  <div className="h-px flex-grow border-t border-neutral-200" />
                  <span className="mx-4 shrink-0 text-[13px] text-neutral-600">
                    {t("auth.login.divider")}
                  </span>
                  <div className="h-px flex-grow border-t border-neutral-200" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <SignupField
                    id="name"
                    type="text"
                    label={t("auth.signup.name")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={MAX_NAME_LENGTH}
                    disabled={busy}
                  />
                  <SignupField
                    id="email"
                    type="email"
                    label={t("auth.signup.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={busy}
                  />
                  <SignupField
                    id="password"
                    type={showPassword ? "text" : "password"}
                    label={t("auth.signup.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
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
                  <SignupField
                    id="password_confirmation"
                    type={showConfirmPassword ? "text" : "password"}
                    label={t("auth.signup.confirmPassword")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={busy}
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
                    disabled={busy}
                    className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary-navy px-6 text-[15px] font-[400] text-white shadow-sm transition-colors hover:bg-[#152c6e] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading && (
                      <MaterialIcon name="progress_activity" size={18} className="animate-spin" />
                    )}
                    {isLoading ? t("auth.signup.submitLoading") : t("auth.signup.submit")}
                  </button>
                </form>

                <div className="pt-4 text-center">
                  <p className="text-[14px] text-neutral-600">
                    {t("auth.signup.loginPrompt")}{" "}
                    <Link href={loginHref} className="ml-1 font-[400] text-primary-navy hover:underline">
                      {t("auth.signup.loginLink")}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
