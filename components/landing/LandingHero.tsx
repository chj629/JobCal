"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

// docs/stitch/랜딩페이지/screen.png Hero. 기존 2단(텍스트+KPI 미리보기 카드) 레이아웃 대신
// 시안대로 가운데 정렬 + 버튼 2개 + 하단 제품 미리보기 이미지 구조로 교체한다. 헤드라인은
// sidebar.tagline("就活を、もっとスマートに。")과 완전히 동일한 문구라 새 키를 만들지 않고
// 재사용한다(하단 최종 CTA도 동일 문구를 재사용). 제품 미리보기는 실제 이미지가 아직 없어
// (사용자 지시: 이미지 영역은 나중에 채움) 시안과 동일한 비율/브라우저 크롬 프레임만
// 재현하고 내부는 placeholder 아이콘으로 채운다.
export default function LandingHero() {
  const t = useT();
  const router = useRouter();

  return (
    <header className="mx-auto flex max-w-[1200px] flex-col items-center px-6 pt-40 pb-24 text-center md:px-12">
      <h1 className="mb-6 max-w-4xl text-[40px] leading-[1.1] font-[400] tracking-tight text-neutral-900 sm:text-[64px]">
        {t("sidebar.tagline")}
      </h1>
      <p className="mb-12 max-w-2xl text-[18px] leading-[1.4] text-neutral-600">
        {t("landing.hero.description")}
      </p>

      <div className="mb-24 flex flex-col justify-center gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="flex items-center justify-center gap-2 rounded-stitch-2xl bg-primary-navy px-6 py-3 text-[14px] font-[400] text-white shadow-[0_2px_10px_rgba(30,58,138,0.15)] transition-all hover:bg-[#152c6e]"
        >
          {t("landing.hero.getStarted")}
          <MaterialIcon name="arrow_forward" size={16} />
        </button>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-stitch-2xl border border-neutral-200 bg-white px-6 py-3 text-[14px] font-[400] text-neutral-800 transition-all hover:border-neutral-300 hover:bg-neutral-50"
        >
          {t("landing.hero.login")}
        </button>
      </div>

      {/* 제품 미리보기: 실제 대시보드 이미지는 추후 삽입 예정. 지금은 시안과 동일한
          브라우저 크롬 프레임 + 16:9 비율만 재현한다. */}
      <div className="w-full max-w-6xl overflow-hidden rounded-stitch-lg border border-neutral-200 bg-white shadow-[0_4px_40px_rgba(0,0,0,0.03)]">
        <div className="flex h-10 items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        </div>
        <div
          aria-hidden="true"
          className="flex aspect-[16/9] items-center justify-center bg-neutral-50 text-neutral-300"
        >
          <MaterialIcon name="dashboard" size={48} />
        </div>
      </div>
    </header>
  );
}
