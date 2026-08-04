"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/locale-context";

const MIN_PASSWORD_LENGTH = 6;

type SessionStatus = "checking" | "ready" | "invalid";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const t = useT();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    router.push("/");
    router.refresh();
  }

  if (sessionStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8 text-center text-sm text-secondary">
          {t("auth.updatePassword.checking")}
        </div>
      </div>
    );
  }

  if (sessionStatus === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8 text-center">
          <h1 className="text-[28px] font-semibold text-foreground">
            {t("auth.updatePassword.invalidTitle")}
          </h1>
          <p className="mt-2 text-sm text-secondary">
            {t("auth.updatePassword.invalidMessage")}
          </p>
          <Link
            href="/forgot-password"
            className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t("auth.updatePassword.requestNewLink")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8">
        <h1 className="text-center text-[28px] font-semibold text-foreground">
          {t("auth.updatePassword.title")}
        </h1>
        <p className="mt-2 text-center text-sm text-secondary">
          {t("auth.updatePassword.description")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-secondary">
              {t("auth.updatePassword.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-secondary">
              {t("auth.updatePassword.confirmPassword")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {errorMessage && <p className="text-xs text-error">{errorMessage}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 h-10 w-full rounded-[10px] bg-primary text-sm font-medium text-white disabled:opacity-60"
          >
            {isLoading ? t("auth.updatePassword.submitLoading") : t("auth.updatePassword.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
