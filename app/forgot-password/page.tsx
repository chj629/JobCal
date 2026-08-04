"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
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
      setErrorMessage("재설정 링크가 유효하지 않거나 만료되었습니다. 다시 시도해 주세요.");
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("이메일을 입력해 주세요.");
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
      setErrorMessage("재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setIsLoading(false);
      return;
    }

    setSent(true);
    setIsLoading(false);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8 text-center">
          <h1 className="text-[28px] font-semibold text-foreground">메일을 확인해 주세요</h1>
          <p className="mt-2 text-sm text-secondary">
            {email}로 비밀번호 재설정 메일을 보냈습니다. 메일함에서 링크를 눌러 새 비밀번호를 설정해 주세요.
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
        <h1 className="text-center text-[28px] font-semibold text-foreground">비밀번호 재설정</h1>
        <p className="mt-2 text-center text-sm text-secondary">
          가입하신 이메일로 재설정 링크를 보내드립니다.
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

          {errorMessage && <p className="text-xs text-error">{errorMessage}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 h-10 w-full rounded-[10px] bg-primary text-sm font-medium text-white disabled:opacity-60"
          >
            {isLoading ? "전송 중..." : "재설정 메일 보내기"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-secondary">
          <Link href="/login" className="font-medium text-primary hover:underline">
            로그인 페이지로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
