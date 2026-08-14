"use client";

import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface FeatureItem {
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

// docs/stitch/랜딩페이지/code.html 기준 4개 항목(企業・選考管理/カレンダー/JobCal AI/
// 就活状況の可視化). 기존 구현엔 5번째 "どこでもアクセス" 항목과 JobCal AI의 "近日公開"
// 배지가 있었지만, 시안에는 4개뿐이고 AI 기능은 이미 구현되어 배지가 없다 — 시안 기준으로
// 항목 수/배지 모두 정리한다.
const FEATURE_ITEMS: FeatureItem[] = [
  { icon: "business_center", titleKey: "landing.features.item1Title", descriptionKey: "landing.features.item1Description" },
  { icon: "calendar_today", titleKey: "landing.features.item2Title", descriptionKey: "landing.features.item2Description" },
  { icon: "auto_awesome", titleKey: "landing.features.item3Title", descriptionKey: "landing.features.item3Description" },
  { icon: "bar_chart", titleKey: "landing.features.item4Title", descriptionKey: "landing.features.item4Description" },
];

export default function LandingFeatures() {
  const t = useT();

  return (
    <section id="features" className="mx-auto max-w-[1200px] border-t border-neutral-100 px-6 py-24 md:px-12">
      <div className="mb-20 text-center">
        <h2 className="mb-4 text-[32px] leading-[1.2] font-[400] tracking-tight text-neutral-900">
          {t("landing.features.title")}
        </h2>
        <p className="text-[18px] text-neutral-600">{t("landing.features.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {FEATURE_ITEMS.map(({ icon, titleKey, descriptionKey }) => (
          <div key={titleKey} className="flex flex-col items-center p-4 text-center">
            <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-stitch-lg bg-primary-navy/5 text-primary-navy">
              <MaterialIcon name={icon} size={28} />
            </span>
            <h3 className="mb-3 text-[16px] font-[400] tracking-tight text-neutral-900">{t(titleKey)}</h3>
            <p className="text-[14px] leading-[1.4] text-neutral-600">{t(descriptionKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
