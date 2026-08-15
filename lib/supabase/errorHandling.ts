"use client";

import { createClient } from "@/lib/supabase/client";

// lib/*-context.tsx 전체가 Supabase 요청 실패 시 공통으로 쓰는 헬퍼. 세션이 실제로
// 만료된 경우(재로그인이 필요한 경우)에만 /login으로 보내고, 그 외의 일반 네트워크/DB
// 오류(RLS 위반, 잘못된 값 등 — 세션은 여전히 유효함)는 그대로 setError로 넘겨 기존
// toast/에러 배너 흐름을 유지한다. 에러 메시지 문자열을 패턴 매칭하는 대신 실제로
// supabase.auth.getUser()를 다시 호출해 세션 생존 여부를 직접 확인하므로 오탐이 없다.
export async function handleSupabaseError(
  message: string,
  setError: (message: string | null) => void
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "/login";
    return;
  }

  setError(message);
}
