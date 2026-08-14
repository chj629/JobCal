"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/locale-context";
import SiteHeader from "@/components/ui/SiteHeader";

// docs/stitch/랜딩페이지/screen.png 상단 고정 네비게이션. code.html 기준 링크는
// Functions(#features)/JobCal AI(#ai) 2개뿐이라 기존의 요금제/사용법/FAQ 비활성 링크는
// 제거한다(해당 페이지가 없어 시안에도 없음). 로그인/회원가입 이동은 기존 기능(useRouter
// push)을 그대로 재사용한다. 언어 전환은 SiteHeader가 항상 맨 오른쪽에 직접 렌더링하므로
// (로고~언어 전환 위치를 모든 화면에서 동일하게 유지하기 위해) 여기서는 렌더링하지 않는다
// — 이 메뉴/버튼들은 SiteHeader의 children으로, 로고와 언어 전환 "사이"에만 놓인다.
export default function LandingNav() {
  const t = useT();
  const router = useRouter();

  return (
    <SiteHeader>
      <div className="hidden items-center gap-8 md:flex">
        <a
          href="#features"
          className="text-[13px] font-[400] text-neutral-600 transition-colors hover:text-neutral-900"
        >
          {t("landing.nav.features")}
        </a>
        <a
          href="#ai"
          className="text-[13px] font-[400] text-neutral-600 transition-colors hover:text-neutral-900"
        >
          {t("landing.nav.ai")}
        </a>
      </div>

      {/* 375/430px에서는 로고+메뉴+언어전환을 한 줄에 다 넣으면 폭을 초과해 겹치므로
          숨긴다 — 같은 로그인/시작하기 동작은 LandingHero.tsx의 CTA 버튼으로 이미
          바로 아래에서 제공되므로 기능 손실은 없다. sm(640px)부터 기존과 동일하게 표시. */}
      <div className="hidden items-center gap-5 border-l border-neutral-200 pl-8 sm:flex">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="text-[13px] font-[400] text-neutral-900 transition-colors hover:text-primary-navy"
        >
          {t("landing.nav.login")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="whitespace-nowrap rounded-stitch-2xl bg-primary-navy px-5 py-2 text-[13px] font-[400] text-white shadow-[0_2px_10px_rgba(30,58,138,0.15)] transition-colors hover:bg-[#152c6e]"
        >
          {t("landing.nav.getStarted")}
        </button>
      </div>
    </SiteHeader>
  );
}
