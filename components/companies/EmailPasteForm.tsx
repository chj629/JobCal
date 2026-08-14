"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface EmailPasteFormProps {
  onAnalyze: (emailText: string) => void;
  loading: boolean;
  error: string | null;
  // AiMailDrawer가 넘겨주면 footer 버튼을 Drawer의 고정 footer 영역으로 portal
  // 렌더링한다. 생략(예: new-from-email 페이지의 전체 폭 사용)하면 기존처럼
  // content 하단에 그대로 인라인 렌더링한다 — 로직은 동일, 위치만 다르다.
  footerContainer?: HTMLDivElement | null;
}

// docs/stitch/AI Drawer/jobcal_dashboard_ai_drawer_step_1_sophisticated_refresh 기준 순서.
const EXTRACT_FIELD_KEYS = [
  "aiEmail.paste.extractFields.company",
  "aiEmail.paste.extractFields.step",
  "aiEmail.paste.extractFields.result",
  "aiEmail.paste.extractFields.schedule",
  "aiEmail.paste.extractFields.contact",
  "aiEmail.paste.extractFields.url",
  "aiEmail.paste.extractFields.memo",
];

// docs/stitch/AI Drawer/jobcal_dashboard_ai_drawer_step_1_sophisticated_refresh의 "メールから
// 企業追加" 화면. 분석 중 로딩 화면은 대응하는 screen.png가 없어 기존 스피너 UI를 색/폰트만
// 새 토큰에 맞춰 유지한다.
export default function EmailPasteForm({
  onAnalyze,
  loading,
  error,
  footerContainer,
}: EmailPasteFormProps) {
  const t = useT();
  const [emailText, setEmailText] = useState("");
  const hasText = emailText.trim().length > 0;

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-navy/10 text-primary-navy">
          <MaterialIcon name="progress_activity" size={28} className="animate-spin" />
        </span>
        <h2 className="mt-2 text-[16px] font-[500] text-stitch-ink">
          {t("aiEmail.paste.analyzingTitle")}
        </h2>
        <p className="text-[13px] text-secondary">{t("aiEmail.paste.analyzingDescription")}</p>
        <p className="mt-4 text-[12px] text-secondary">{t("aiEmail.paste.analyzingEstimate")}</p>
      </div>
    );
  }

  const footer = (
    <button
      type="button"
      disabled={!hasText}
      onClick={() => onAnalyze(emailText)}
      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-navy py-3.5 text-[14px] font-[500] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <MaterialIcon name="auto_awesome" size={18} />
      {t("aiEmail.paste.submit")}
    </button>
  );

  return (
    <div className={footerContainer ? "" : "flex h-full flex-col"}>
      <h3 className="mb-8 text-[24px] font-[500] tracking-tight text-stitch-ink">
        {t("aiEmail.paste.title")}
      </h3>

      <div className={footerContainer ? "space-y-8" : "flex-1 space-y-8"}>
        {error && (
          <div className="flex items-start gap-3 rounded-stitch-2xl border border-error/40 bg-error/10 p-4">
            <MaterialIcon name="warning" size={18} className="mt-0.5 shrink-0 text-error" />
            <div>
              <p className="text-[13px] font-[500] text-error">{t("aiEmail.paste.errorTitle")}</p>
              <p className="mt-1 text-[12px] text-error">{error}</p>
            </div>
          </div>
        )}

        <div className="rounded-stitch-2xl border border-stitch-border bg-stitch-bg p-6">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-[500] text-secondary">
            <MaterialIcon name="info" size={16} />
            {t("aiEmail.paste.infoTitle")}
          </p>
          <div className="flex flex-wrap gap-2">
            {EXTRACT_FIELD_KEYS.map((key) => (
              <span
                key={key}
                className="rounded-full border border-stitch-border bg-white px-3 py-1 text-[11px] text-stitch-ink"
              >
                {t(key)}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="px-1 text-[13px] font-[500] text-stitch-ink">{t("aiEmail.paste.label")}</p>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder={t("aiEmail.paste.placeholder")}
            className="h-[320px] w-full resize-none rounded-stitch-2xl border border-stitch-border bg-white p-6 text-[14px] text-stitch-ink outline-none transition-all placeholder:text-secondary focus:border-primary-navy focus:ring-1 focus:ring-primary-navy"
          />
        </div>
      </div>

      {footerContainer ? (
        // footerContainer(AiMailDrawer가 만든 placeholder)가 이미 "flex gap-3" 행이므로,
        // 여기서 또 감싸면 flex row 안에 flex row가 중첩돼 안쪽 div가 flex-grow 없는
        // 기본값(내용 크기만큼만)으로 축소되어 버튼이 좁게 보였다. 감싸지 않고 버튼을
        // 그 행의 직접 자식으로 portal해야 버튼 자신의 flex-1이 정상 적용된다.
        createPortal(footer, footerContainer)
      ) : (
        <div className="mt-auto flex gap-3 pt-8">{footer}</div>
      )}
    </div>
  );
}
