"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

// docs/stitch/랜딩페이지/screen.png 최종 CTA. 시안은 Hero와 동일한 헤드라인(sidebar.tagline)을
// 다시 쓰고, 버튼도 "無料で始める" 하나뿐이라 기존의 설명 문구+버튼 구조에서 설명 문구를 제거한다.
export default function LandingCtaBanner() {
  const t = useT();
  const router = useRouter();

  return (
    <section className="mx-auto mb-12 max-w-4xl border-t border-neutral-100 px-6 py-24 text-center md:px-12">
      <h2 className="mb-10 text-[48px] leading-[1.1] font-[400] tracking-tight text-neutral-900">
        {t("sidebar.tagline")}
      </h2>

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
