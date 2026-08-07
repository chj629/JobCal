"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";
import AuthLayout from "@/components/auth/AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const t = useT();
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
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
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

  if (sent) {
    return (
      <AuthLayout>
        <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8 text-center">
          <h1 className="text-[28px] font-semibold text-foreground">
            {t("auth.forgotPassword.sentTitle")}
          </h1>
          <p className="mt-2 text-sm text-secondary">
            {t("auth.forgotPassword.sentMessage", { email })}
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t("auth.forgotPassword.backToLoginFromSent")}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8">
        <h1 className="text-center text-[28px] font-semibold text-foreground">
          {t("auth.forgotPassword.title")}
        </h1>
        <p className="mt-2 text-center text-sm text-secondary">
          {t("auth.forgotPassword.description")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Input
            type="email"
            label={t("auth.forgotPassword.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {errorMessage && <p className="text-xs text-error">{errorMessage}</p>}

          <Button type="submit" variant="primary" disabled={isLoading} className="mt-2 w-full">
            {isLoading ? t("auth.forgotPassword.submitLoading") : t("auth.forgotPassword.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-secondary">
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
