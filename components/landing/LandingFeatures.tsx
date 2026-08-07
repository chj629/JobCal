"use client";

import { BarChart3, Building2, CalendarDays, Cloud, Mail, type LucideIcon } from "lucide-react";
import { useT } from "@/lib/locale-context";
import Badge from "@/components/ui/Badge";

interface FeatureItem {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  badgeKey?: string;
}

const FEATURE_ITEMS: FeatureItem[] = [
  { icon: CalendarDays, titleKey: "landing.features.item1Title", descriptionKey: "landing.features.item1Description" },
  { icon: Building2, titleKey: "landing.features.item2Title", descriptionKey: "landing.features.item2Description" },
  {
    icon: Mail,
    titleKey: "landing.features.item3Title",
    descriptionKey: "landing.features.item3Description",
    badgeKey: "landing.features.item3Badge",
  },
  { icon: BarChart3, titleKey: "landing.features.item4Title", descriptionKey: "landing.features.item4Description" },
  { icon: Cloud, titleKey: "landing.features.item5Title", descriptionKey: "landing.features.item5Description" },
];

// 34_landingPage.png "JobCalでできること" 섹션. AI 메일 자동 정리는 MVP 제외 기능(향후 업데이트)이므로
// 기존 Badge 컴포넌트로 "오픈 예정" 표시만 하고 별도 기능 링크는 연결하지 않는다.
export default function LandingFeatures() {
  const t = useT();

  return (
    <section id="features" className="border-t border-border bg-card py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          {t("landing.features.title")}
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURE_ITEMS.map(({ icon: Icon, titleKey, descriptionKey, badgeKey }) => (
            <div key={titleKey} className="rounded-[10px] border border-border p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={22} />
              </span>
              <p className="mt-4 text-sm font-semibold text-foreground">{t(titleKey)}</p>
              <p className="mt-1.5 text-xs text-secondary">{t(descriptionKey)}</p>
              {badgeKey && (
                <Badge variant="info" size="sm" className="mt-3">
                  {t(badgeKey)}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
