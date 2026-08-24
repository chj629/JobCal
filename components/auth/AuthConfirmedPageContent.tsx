"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/lib/locale-context";
import { toPublicPageHref } from "@/lib/i18n/publicLocalePaths";
import { resolveNextPath } from "@/lib/auth/nextPath";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthHeroPanel from "@/components/auth/AuthHeroPanel";
import MaterialIcon from "@/components/ui/MaterialIcon";

// app/auth/confirmed/page.tsx(ja)와 app/ko/auth/confirmed/page.tsx(ko)가 공유하는 실제
// 페이지 본문 — 두 라우트 모두 이 컴포넌트를 그대로 렌더링하고, 감싸는
// LocaleProvider(locked)의 initialLocale만 다르다. 본문을 언어별로 복제하지 않는다.
// app/auth/confirm/route.ts가 가입 시 선택된 locale에 맞는 쪽(/auth/confirmed 또는
// /ko/auth/confirmed)으로 이미 분기해서 보내주므로, 이 컴포넌트 자신은 어느 쪽에
// 있는지만 알면 된다(useLocale()이 locked Provider를 통해 그 값을 준다) — 로그인
// 버튼도 같은 locale의 로그인 URL로 이동한다.
//
// docs/stitch/인증플로우/jobcal_password_changed_unified_auth_design_sync/screen.png 기준.
// 이 배치에는 "이메일 인증 완료" 전용 시안이 따로 없어, 구조가 동일한(체크 아이콘 +
// 제목 + 설명 + 버튼 1개) "비밀번호 재설정 완료" 시안을 그대로 템플릿으로 재사용한다.
// 문구 자체는 이 화면 고유의 이메일 인증 완료 내용(auth.confirmed.*, 기존 키 그대로)을
// 유지한다. 헤더/좌측 패널은 다른 인증 화면과 동일한 공용 컴포넌트를 재사용한다.
export default function AuthConfirmedPageContent() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  // app/auth/confirm/route.ts가 next(이미 서버에서 resolveNextPath로 검증됨)를
  // ?next=...로 넘겨준다. 여기서도(클라이언트에서 직접 이 URL을 열 수도 있으므로)
  // resolveNextPath로 다시 한번 검증한 뒤에만 신뢰한다 — 검증에 실패하면 빈 문자열이라
  // 기존과 동일하게 순수 로그인 URL로만 이동한다.
  const [loginTarget, setLoginTarget] = useState(() => toPublicPageHref(locale, "/login"));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = resolveNextPath(params.get("next"), "");
    const loginBase = toPublicPageHref(locale, "/login");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoginTarget(next ? `${loginBase}?next=${encodeURIComponent(next)}` : loginBase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGoToLogin() {
    setIsLoading(true);

    // app/auth/confirm/route.ts가 회원가입 이메일 확인(verifyOtp)을 세션을 쿠키에 전혀
    // 남기지 않는 일회성 클라이언트로 처리하므로, 이 화면에 도달한 시점엔 애초에 이
    // 브라우저에 새로 생긴 세션이 없다 — signOut할 것이 없다(기존에 로그인 중이던
    // 세션이 있었다면 그대로 유지된다). 뒤로가기로 이 페이지에 다시 돌아오지 않도록
    // push 대신 replace만으로 로그인 화면으로 이동한다.
    router.replace(loginTarget);
  }

  return (
    <div className="min-h-screen bg-white font-[350] font-[family-name:var(--font-hanken-grotesk)] tracking-[-0.025em] text-neutral-900">
      <AuthHeader />

      <main className="flex min-h-screen items-center justify-center p-6 pt-24 md:p-12 md:pt-24">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-16 md:grid-cols-2 md:gap-24">
          <AuthHeroPanel />

          {/* 우측: 완료 안내 */}
          <div className="mx-auto w-full max-w-[440px] md:mr-0 md:ml-auto">
            <div className="space-y-6 py-4 text-center">
              <div className="flex justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dbeafe]/50 text-primary-navy">
                  <MaterialIcon name="check_circle" size={40} filled />
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-[32px] font-[400] tracking-tight text-neutral-900">
                  {t("auth.confirmed.title")}
                </h2>
                <p className="text-[15px] leading-[1.5] text-neutral-600">
                  {t("auth.confirmed.messageLine1")}
                  <br />
                  {t("auth.confirmed.messageLine2")}
                  <br />
                  {t("auth.confirmed.messageLine3")}
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoToLogin}
                disabled={isLoading}
                className="mt-4 h-[52px] w-full rounded-full bg-primary-navy px-6 text-[15px] font-[400] text-white shadow-sm transition-colors hover:bg-[#152c6e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? t("auth.confirmed.buttonLoading") : t("auth.confirmed.button")}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
