"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      setErrorMessage("로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8 text-center">
        <h1 className="text-[28px] font-semibold text-foreground">JobCal</h1>
        <p className="mt-2 text-sm text-secondary">
          일본 취업 활동을 한곳에서 관리하세요.
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="mt-8 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border text-sm font-medium text-foreground hover:bg-background disabled:opacity-60"
        >
          {isLoading ? "이동 중..." : "Google로 로그인"}
        </button>

        {errorMessage && <p className="mt-3 text-xs text-error">{errorMessage}</p>}
      </div>
    </div>
  );
}
