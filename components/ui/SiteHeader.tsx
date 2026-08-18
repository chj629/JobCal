"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useT } from "@/lib/locale-context";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

export interface SiteHeaderProps {
  // 랜딩 전용 메뉴/로그인/회원가입 버튼 등, 로고와 언어 전환 "사이"에만 들어가는 콘텐츠.
  // 인증 페이지는 이 prop을 생략한다.
  children?: ReactNode;
  // 61차: 랜딩 Header의 모바일(390px) 반응형 대응 전용 opt-in(기본 false). true일
  // 때만 로고↔children↔언어전환 사이 gap이 sm 미만에서 좁아지고(gap-8→gap-2,
  // sm 이상은 기존과 동일한 gap-8), LanguageSwitcher도 compact 모드로 넘어간다.
  // 이 prop을 넘기지 않는 인증 페이지(AuthHeader 등)는 지금과 완전히 동일하게
  // 렌더링된다 — sm 이상(태블릿 768px 포함)/데스크톱은 어느 쪽이든 결과가 같다.
  compactOnMobile?: boolean;
}

// 랜딩 페이지(LandingNav)와 모든 인증 페이지(AuthHeader → login/signup/forgot-password/
// update-password/auth/confirmed)가 공유하는 상단 헤더. 로고와 언어 전환의 실제 X/Y
// 좌표가 어느 화면에서나 완전히 같아야 한다는 요구사항 때문에, 언어 전환(LanguageSwitcher)을
// children으로 받지 않고 이 컴포넌트가 직접 렌더링한다 — 그래야 랜딩 전용 메뉴/버튼이
// 아무리 넓어져도 "flex-1 justify-end" 그룹의 항상 마지막 항목인 언어 전환 위치는
// (컨테이너 우측 padding을 기준으로) 절대 밀리지 않는다. 로고도 shrink-0로 항상 좌측
// 고정 폭이라 오른쪽 콘텐츠 양과 무관하게 X가 고정된다. 높이(h-[68px])도 여기 한 곳에서만
// 관리해 화면마다 컨텐츠 높이 차이로 다시 어긋나는 일이 없게 한다.
export default function SiteHeader({ children, compactOnMobile = false }: SiteHeaderProps) {
  const t = useT();
  // position:fixed 요소의 폭은 window.innerWidth(세로 스크롤바 트랙 포함)를 기준으로
  // 계산되는데, 페이지마다 실제 스크롤바 유무가 달라(콘텐츠가 긴 랜딩 vs 한 화면에 다
  // 들어가는 로그인 등) 이 값 자체가 페이지마다 몇 px씩 달라져 헤더 내부 요소(로고/언어
  // 전환)의 실제 X 좌표가 밀리는 문제가 있었다. html 전체에 스크롤바를 항상 강제하면
  // (app) 내부 페이지에도 불필요한 스크롤바가 늘 보이게 되므로, SiteHeader가 마운트되어
  // 있는 동안(=이 6개 공개 페이지를 보고 있는 동안)에만 documentElement에
  // "force-scrollbar-gutter" 클래스를 붙였다 언마운트 시 제거해, 이 화면들끼리는 항상
  // 같은 스크롤바 상태(=같은 실제 폭)를 갖도록 범위를 좁힌다.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("force-scrollbar-gutter");
    return () => root.classList.remove("force-scrollbar-gutter");
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div
        className={
          "mx-auto flex h-[68px] max-w-[1400px] items-center px-6 " +
          (compactOnMobile ? "gap-2 sm:gap-8" : "gap-8")
        }
      >
        <Link
          href="/"
          className="shrink-0 text-2xl font-[500] tracking-tight text-primary-navy"
        >
          {t("common.appName")}
        </Link>
        <div
          className={
            "flex flex-1 items-center justify-end " + (compactOnMobile ? "gap-2 sm:gap-8" : "gap-8")
          }
        >
          {children}
          <LanguageSwitcher compact={compactOnMobile} />
        </div>
      </div>
    </header>
  );
}
