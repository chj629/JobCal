"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLocale, useT } from "@/lib/locale-context";
import { toPublicPageHref } from "@/lib/i18n/publicLocalePaths";
import MaterialIcon from "@/components/ui/MaterialIcon";
import AiOnboardingStep2 from "@/components/AiOnboardingStep2";

interface EmailPasteFormProps {
  onAnalyze: (emailText: string) => void;
  loading: boolean;
  error: string | null;
  // true면 error가 세션 만료 안내이므로, 로그인 화면으로 이동하는 링크를 함께 보여준다.
  // 생략하면 기존처럼 텍스트만 표시한다.
  isSessionExpired?: boolean;
  // "free" | "pro"면 error가 일일 AI 분석 한도 초과 안내다. "free"일 때만 제목을 전용
  // 문구로 바꾸고 Settings Plan 탭으로 가는 CTA를 보여준다. "pro"는 기존 제목을 그대로
  // 쓰고 본문 메시지만 바뀐다(업그레이드 CTA 없음). null/생략이면 기존과 동일하다.
  dailyLimitPlan?: "free" | "pro" | null;
  // AiMailDrawer가 넘겨주면 footer 버튼을 Drawer의 고정 footer 영역으로 portal
  // 렌더링한다. 생략(예: new-from-email 페이지의 전체 폭 사용)하면 기존처럼
  // content 하단에 그대로 인라인 렌더링한다 — 로직은 동일, 위치만 다르다.
  footerContainer?: HTMLDivElement | null;
  // AI onboarding Step 2(AiMailDrawer 전용, app/(app)/layout.tsx가 내려줌).
  // new-from-email 페이지는 두 prop을 넘기지 않으므로 항상 false로 동작해
  // 기존 화면은 전혀 영향받지 않는다.
  showOnboardingStep2?: boolean;
  onOnboardingStep2Dismiss?: () => void;
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
  isSessionExpired = false,
  dailyLimitPlan = null,
  footerContainer,
  showOnboardingStep2 = false,
  onOnboardingStep2Dismiss,
}: EmailPasteFormProps) {
  const t = useT();
  const { locale } = useLocale();
  const [emailText, setEmailText] = useState("");
  const hasText = emailText.trim().length > 0;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 실제 "AIで分析" 버튼 — AiOnboardingStep2의 buttonSpotlight 단계가 이 버튼 자체를
  // spotlight한다(새 버튼을 만들지 않는다).
  const analyzeButtonRef = useRef<HTMLButtonElement>(null);
  // AiOnboardingStep2가 textareaSpotlight 단계인 동안에만 true — 그동안 textarea
  // placeholder를 튜토리얼용 문구로 바꾼다(온보딩이 끝나면 AiOnboardingStep2가 false로
  // 되돌려 원래 placeholder로 복원된다).
  const [spotlightActive, setSpotlightActive] = useState(false);

  // Step 2 튜토리얼의 최종 종료 조건은 이제 "메일 붙여넣기"가 아니라 사용자가 실제
  // "AIで分析" 버튼을 누르는 순간이다(아래 footer 버튼의 onClick 참고). textarea에
  // 붙여넣거나 입력하는 것만으로는 더 이상 종료하지 않는다 — AiOnboardingStep2가
  // hasText prop을 보고 textareaSpotlight ↔ buttonSpotlight 사이를 자체적으로
  // 오간다(아래 <AiOnboardingStep2 hasText={hasText} .../> 참고).
  function dismissOnboardingStep2IfActive() {
    if (showOnboardingStep2) onOnboardingStep2Dismiss?.();
  }

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
      ref={analyzeButtonRef}
      type="button"
      disabled={!hasText}
      onClick={() => {
        // 실제 분석 로직은 그대로 실행하고, 그 same 클릭이 Step 2 튜토리얼의 최종
        // 종료 조건이기도 하다 — 별도 분석을 가로채거나 만들지 않는다. showOnboardingStep2가
        // false면(온보딩 중이 아니면) dismissOnboardingStep2IfActive는 아무 일도 하지 않는다.
        onAnalyze(emailText);
        dismissOnboardingStep2IfActive();
      }}
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
              <p className="text-[13px] font-[500] text-error">
                {dailyLimitPlan === "free" ? t("aiEmail.paste.freeLimitTitle") : t("aiEmail.paste.errorTitle")}
              </p>
              <p className="mt-1 whitespace-pre-line text-[12px] text-error">{error}</p>
              {isSessionExpired && (
                <Link
                  href={toPublicPageHref(locale, "/login")}
                  className="mt-2 inline-block text-[12px] font-[500] text-error underline underline-offset-2 hover:opacity-80"
                >
                  {t("common.loginAgain")}
                </Link>
              )}
              {dailyLimitPlan === "free" && (
                <Link
                  href="/settings?tab=plan"
                  className="mt-2 inline-block text-[12px] font-[500] text-primary-navy underline underline-offset-2 hover:opacity-80"
                >
                  {t("aiEmail.paste.freeLimitCta")}
                </Link>
              )}
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
            ref={textareaRef}
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder={spotlightActive ? t("aiOnboarding.step2.tutorialPlaceholder") : t("aiEmail.paste.placeholder")}
            className="h-[320px] w-full resize-none rounded-stitch-2xl border border-stitch-border bg-white p-6 text-[14px] text-stitch-ink outline-none transition-all placeholder:text-secondary focus:border-primary-navy focus:ring-1 focus:ring-primary-navy"
          />
        </div>
      </div>

      {/* showOnboardingStep2가 아니라 onOnboardingStep2Dismiss 유무로만 렌더 여부를
          결정한다 — showOnboardingStep2로 게이팅하면 그 값이 false가 되는 바로 그
          렌더에서 AiOnboardingStep2가 통째로 unmount되어, 그 안의 dim fade-out
          로직(active=false가 된 뒤에도 잠깐 더 mount된 채로 opacity만 내리는 처리)이
          실행될 기회조차 없이 dim이 즉시 사라져 버렸다. active={showOnboardingStep2}는
          그대로 넘기고, "언제 실제로 사라질지"는 전적으로 AiOnboardingStep2 자신의
          내부 mounted 상태가 결정하게 한다. */}
      {onOnboardingStep2Dismiss && (
        <AiOnboardingStep2
          active={showOnboardingStep2}
          textareaRef={textareaRef}
          analyzeButtonRef={analyzeButtonRef}
          hasText={hasText}
          onDismiss={onOnboardingStep2Dismiss}
          onSpotlightActiveChange={setSpotlightActive}
        />
      )}

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
