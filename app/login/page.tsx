"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import AuthLayout from "@/components/auth/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function mapSignInError(t: (key: string) => string, message: string): string {
  if (message.includes("Invalid login credentials")) {
    return t("auth.errors.invalidCredentials");
  }
  if (message.includes("Email not confirmed")) {
    return t("auth.errors.emailNotConfirmed");
  }
  return t("auth.errors.loginFailed");
}

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // 정적 프리렌더 결과는 쿼리스트링을 알 수 없어 항상 빈 문자열이다. 최초 렌더를 그 값과
  // 동일하게 유지해 hydration mismatch를 피하고, 마운트 이후에만 쿼리를 확인해 반영한다.
  const [errorMessage, setErrorMessage] = useState("");

  // URL 쿼리(외부 상태)와의 최초 동기화이며, 정적 프리렌더와의 hydration 일치를 위해
  // 의도적으로 마운트 후 처리한다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "confirm_failed") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage(t("auth.errors.confirmFailed"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleLogin() {
    setIsLoading(true);
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8">
        <h1 className="text-center text-[28px] font-semibold text-foreground">
          {t("common.appName")}
        </h1>
        <p className="mt-2 text-center text-sm text-secondary">{t("auth.login.description")}</p>

        <Button
          type="button"
          variant="secondary"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="mt-8 w-full"
        >
          {isLoading ? t("auth.login.googleLoading") : t("auth.login.google")}
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-secondary">{t("auth.login.divider")}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <Input
            type="email"
            icon={Mail}
            label={t("auth.login.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            icon={Lock}
            label={t("auth.login.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" variant="primary" disabled={isLoading} className="w-full">
            {isLoading ? t("auth.login.submitLoading") : t("auth.login.submit")}
          </Button>

          <Link
            href="/forgot-password"
            className="text-center text-sm text-secondary hover:text-foreground hover:underline"
          >
            {t("auth.login.forgotPassword")}
          </Link>
        </form>

        {errorMessage && <p className="mt-3 text-center text-xs text-error">{errorMessage}</p>}

        <p className="mt-6 text-center text-sm text-secondary">
          {t("auth.login.signupPrompt")}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t("auth.login.signupLink")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
