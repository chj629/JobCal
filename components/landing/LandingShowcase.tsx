"use client";

import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

// docs/stitch/랜딩페이지/screen.png의 "洗練されたワークスペース" 섹션(신규 추가 — 기존
// 랜딩 페이지엔 없던 섹션). Dashboard/AI Assistant 목업 이미지 2장은 아직 실제 이미지가
// 없어(사용자 지시: 이미지 영역은 나중에 채움) 시안과 동일한 카드 비율/여백만 재현하고
// 내부는 placeholder 아이콘으로 채운다.
const SHOWCASE_ITEMS = [
  { icon: "dashboard", labelKey: "landing.showcase.item1Label" },
  { icon: "auto_awesome", labelKey: "landing.showcase.item2Label" },
] as const;

export default function LandingShowcase() {
  const t = useT();

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-24 text-center md:px-12">
      <h2 className="mb-6 text-[32px] leading-[1.2] font-[400] tracking-tight text-neutral-900">
        {t("landing.showcase.title")}
      </h2>
      <p className="mx-auto mb-20 max-w-2xl text-[18px] text-neutral-600">
        {t("landing.showcase.description")}
      </p>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {SHOWCASE_ITEMS.map(({ icon, labelKey }) => (
          <div
            key={labelKey}
            className="flex flex-col overflow-hidden rounded-stitch-lg border border-neutral-200 bg-neutral-50 px-10 pt-10"
          >
            <h4 className="mb-8 text-left text-[16px] font-[400] tracking-tight text-neutral-900">
              {t(labelKey)}
            </h4>
            <div
              aria-hidden="true"
              className="flex aspect-[4/3] w-full items-center justify-center rounded-t-[24px] border border-neutral-200 bg-white text-neutral-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <MaterialIcon name={icon} size={40} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
