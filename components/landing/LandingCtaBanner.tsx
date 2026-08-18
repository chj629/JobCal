"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

// 랜딩페이지 전면 리뉴얼(2026-08). 56차: Dashboard/Calendar/Companies showcase로 이미
// 실제 제품 화면을 충분히 보여준 뒤라, 마지막 CTA는 "메일 하나만 붙여넣어보라"는 구체적인
// 행동 유도 대신 "정리는 JobCal에게 맡기고 전형에 집중하라"는 더 담백한 마무리 문구로
// 바꿨다. 제목만 있던 구조에 설명 한 줄을 추가했다(과하게 화려한 마무리가 아니라 Hero
// 아래 다른 showcase 섹션들과 같은 차분한 톤 유지).
export default function LandingCtaBanner() {
  const t = useT();
  const router = useRouter();

  return (
    <section className="mx-auto mb-12 max-w-4xl border-t border-neutral-100 px-6 py-24 text-center md:px-12">
      <h2 className="mb-4 text-[40px] leading-[1.2] font-[400] tracking-tight break-keep text-neutral-900 sm:text-[48px]">
        {t("landing.finalCta.title")}
      </h2>
      <p className="mb-10 text-[16px] leading-[1.7] break-keep text-neutral-500 sm:text-[18px]">
        {t("landing.finalCta.description")}
      </p>

      <button
        type="button"
        onClick={() => router.push("/signup")}
        className="mx-auto flex items-center justify-center gap-2 rounded-stitch-2xl bg-primary-navy px-8 py-3 text-[15px] font-[400] text-white shadow-[0_2px_10px_rgba(30,58,138,0.15)] transition-all hover:bg-[#152c6e]"
      >
        {t("landing.finalCta.getStarted")}
        <MaterialIcon name="arrow_forward" size={18} />
      </button>
    </section>
  );
}
