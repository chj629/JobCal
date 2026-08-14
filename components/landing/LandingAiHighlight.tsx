"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

// docs/stitch/랜딩페이지/screen.png의 "AIがあなたの就活を加速させる" 섹션(신규 추가 —
// 기존 랜딩 페이지엔 없던 섹션). 오른쪽 카드는 실제 AiMailDrawer의 메일 붙여넣기 단계를
// 흉내낸 정적 미리보기이며, 로그인 없이도 보이는 마케팅용 목업이라 실제 useEmailAnalysisFlow
// 로직/textarea 입력 상태는 연결하지 않는다(클릭 불가능한 정적 UI).
const EXTRACT_FIELD_KEYS = [
  "landing.aiHighlight.mockField1",
  "landing.aiHighlight.mockField2",
  "landing.aiHighlight.mockField3",
] as const;

export default function LandingAiHighlight() {
  const t = useT();
  const router = useRouter();

  return (
    <section id="ai" className="border-y border-neutral-200 bg-neutral-50 px-6 py-24 md:px-12">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-16 lg:flex-row lg:gap-24">
        <div className="flex-1 text-left">
          <h2 className="mb-6 text-[32px] leading-[1.2] font-[400] tracking-tight text-neutral-900">
            {t("landing.aiHighlight.title")}
          </h2>
          <p className="mb-10 text-[16px] leading-[1.4] text-neutral-600">
            {t("landing.aiHighlight.description")}
          </p>
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="flex items-center gap-2 text-[14px] font-[400] text-primary-navy transition-opacity hover:opacity-80"
          >
            <MaterialIcon name="auto_awesome" size={18} />
            <span>{t("landing.aiHighlight.cta")}</span>
            <MaterialIcon name="arrow_forward" size={16} className="ml-1" />
          </button>
        </div>

        <div
          aria-hidden="true"
          className="w-full max-w-lg flex-1 rounded-stitch-lg border border-neutral-200 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <div className="mb-6 flex items-center gap-2 border-b border-neutral-100 pb-4">
            <MaterialIcon name="auto_awesome" size={18} className="text-primary-navy" />
            <h3 className="text-[14px] font-[400] text-neutral-900">
              {t("landing.aiHighlight.mockTitle")}
            </h3>
          </div>

          <div className="mb-6 rounded-stitch-2xl border border-neutral-100 bg-neutral-50 p-5">
            <p className="mb-4 flex items-center gap-2 text-[12px] font-[400] text-neutral-600">
              <MaterialIcon name="info" size={14} />
              {t("landing.aiHighlight.mockInfoLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {EXTRACT_FIELD_KEYS.map((key) => (
                <span
                  key={key}
                  className="rounded-md border border-neutral-200 bg-white px-3 py-1 text-[12px] font-[400] text-neutral-700"
                >
                  {t(key)}
                </span>
              ))}
            </div>
          </div>

          <div className="flex h-32 w-full items-start rounded-stitch-2xl border border-neutral-200 bg-white p-4 text-[13px] text-neutral-400">
            {t("landing.aiHighlight.mockPlaceholder")}
          </div>
        </div>
      </div>
    </section>
  );
}
