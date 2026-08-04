"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function mapSignInError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (message.includes("Email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다. 받은 메일함을 확인해 주세요.";
  }
  return "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function LoginPage() {
  const router = useRouter();
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
      setErrorMessage("이메일 인증 링크가 유효하지 않거나 만료되었습니다. 다시 시도해 주세요.");
    }
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
      setErrorMessage("로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      setIsLoading(false);
    }
  }

  async function handleEmailLogin(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(mapSignInError(error.message));
      setIsLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8">
        <h1 className="text-center text-[28px] font-semibold text-foreground">JobCal</h1>
        <p className="mt-2 text-center text-sm text-secondary">
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

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-secondary">또는</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-secondary">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-secondary">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full rounded-[10px] bg-primary text-sm font-medium text-white disabled:opacity-60"
          >
            {isLoading ? "로그인 중..." : "이메일로 로그인"}
          </button>

          <Link
            href="/forgot-password"
            className="text-center text-sm text-secondary hover:text-foreground hover:underline"
          >
            비밀번호를 잊으셨나요?
          </Link>
        </form>

        {errorMessage && <p className="mt-3 text-center text-xs text-error">{errorMessage}</p>}

        <p className="mt-6 text-center text-sm text-secondary">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
