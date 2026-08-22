"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/locale-context";
import { toPublicPageHref } from "@/lib/i18n/publicLocalePaths";

// lib/*-context.tsx 전체가 Supabase 요청 실패 시 공통으로 쓰는 헬퍼. 세션이 실제로
// 만료된 경우(재로그인이 필요한 경우)에만 로그인 화면으로 보내고, 그 외의 일반 네트워크/DB
// 오류(RLS 위반, 잘못된 값 등 — 세션은 여전히 유효함)는 그대로 setError로 넘겨 기존
// toast/에러 배너 흐름을 유지한다. 에러 메시지 문자열을 패턴 매칭하는 대신 실제로
// supabase.auth.getUser()를 다시 호출해 세션 생존 여부를 직접 확인하므로 오탐이 없다.
//
// 세션 만료 시 돌아갈 로그인 페이지를 현재 앱 언어(user_metadata.language 기반,
// lib/locale-context.tsx의 기존 LocaleProvider가 이미 관리)에 맞춰 고른다. 이 함수 자체는
// 훅을 쓸 수 없는 순수 함수가 아니라 하나의 훅으로 만들어, 호출부(Provider 컴포넌트)에서
// useLocale()을 한 번만 읽고 그 결과에 맞는 handleSupabaseError를 돌려준다 — localStorage를
// 직접 읽는 대신 이미 있는 LocaleProvider 값을 그대로 재사용한다.
export function useHandleSupabaseError() {
  const { locale } = useLocale();

  return useCallback(
    async (message: string, setError: (message: string | null) => void) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = toPublicPageHref(locale, "/login");
        return;
      }

      setError(message);
    },
    [locale]
  );
}
