"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 6;

function mapSignUpError(message: string): string {
  if (message.toLowerCase().includes("already registered")) {
    return "이미 가입된 이메일입니다.";
  }
  return "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password || !confirmPassword) {
      setErrorMessage("모든 항목을 입력해 주세요.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      setErrorMessage(mapSignUpError(error.message));
      setIsLoading(false);
      return;
    }

    // 이메일 확인이 꺼져 있는 프로젝트는 signUp() 즉시 세션이 발급된다.
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    setConfirmationSent(true);
    setIsLoading(false);
  }

  if (confirmationSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8 text-center">
          <h1 className="text-[28px] font-semibold text-foreground">이메일을 확인해 주세요</h1>
          <p className="mt-2 text-sm text-secondary">
            {email}로 확인 메일을 보냈습니다. 메일함에서 링크를 눌러 가입을 완료해 주세요.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8">
        <h1 className="text-center text-[28px] font-semibold text-foreground">회원가입</h1>
        <p className="mt-2 text-center text-sm text-secondary">
          JobCal 계정을 만들어 취업 활동을 관리하세요.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
          <div>
            <label className="mb-1 block text-sm text-secondary">비밀번호 확인</label>
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
            {isLoading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-secondary">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
