"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 6;

type SessionStatus = "checking" | "ready" | "invalid";

export default function UpdatePasswordPage() {
  const router = useRouter();
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
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage("비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
          확인 중입니다...
        </div>
      </div>
    );
  }

  if (sessionStatus === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8 text-center">
          <h1 className="text-[28px] font-semibold text-foreground">링크가 유효하지 않습니다</h1>
          <p className="mt-2 text-sm text-secondary">
            비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다. 다시 요청해 주세요.
          </p>
          <Link
            href="/forgot-password"
            className="mt-8 inline-block text-sm font-medium text-primary hover:underline"
          >
            재설정 메일 다시 받기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-[10px] border border-border bg-card p-8">
        <h1 className="text-center text-[28px] font-semibold text-foreground">새 비밀번호 설정</h1>
        <p className="mt-2 text-center text-sm text-secondary">
          새로 사용할 비밀번호를 입력해 주세요.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-secondary">새 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-secondary">새 비밀번호 확인</label>
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
            {isLoading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
