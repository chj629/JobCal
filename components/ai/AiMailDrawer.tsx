"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import EmailPasteForm from "@/components/companies/EmailPasteForm";
import CompanyMatchPicker from "@/components/companies/CompanyMatchPicker";
import EmailAnalysisReview from "@/components/companies/EmailAnalysisReview";
import Drawer from "@/components/ui/Drawer";
import type { Company } from "@/lib/companies";
import type { EmailAnalysisResult } from "@/lib/ai/emailAnalysis";
import { useT } from "@/lib/locale-context";

type Step = "paste" | "match" | "review";

// 13~20_AiDrawer*.png 상단 탭(메일 분석/이력)은 이번 Step에서 History를 만들지 않으므로
// 대신 실제 3단계 흐름(메일 입력 → 기업 선택 → 검토·등록)의 진행 위치를 보여주는
// 단계 표시로 대체한다.
const STEPS: { key: Step; labelKey: string }[] = [
  { key: "paste", labelKey: "aiEmail.drawer.steps.paste" },
  { key: "match", labelKey: "aiEmail.drawer.steps.match" },
  { key: "review", labelKey: "aiEmail.drawer.steps.review" },
];

// app/(app)/companies/new-from-email/page.tsx와 Drawer가 동일한 3단계 흐름을 쓰므로,
// 상태와 handleAnalyze(OpenAI API 호출) 로직을 이 훅 하나로 두고 두 곳에서 그대로 재사용한다.
// 로직 자체는 기존 page.tsx에 있던 것을 옮긴 것일 뿐 내용은 바뀌지 않았다.
export function useEmailAnalysisFlow() {
  const t = useT();
  const [step, setStep] = useState<Step>("paste");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<EmailAnalysisResult | null>(null);
  const [existingCompany, setExistingCompany] = useState<Company | null>(null);

  async function handleAnalyze(emailText: string) {
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const response = await fetch("/api/ai/analyze-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText }),
      });

      const json = await response.json();

      if (!response.ok) {
        // API가 돌려준 에러 코드/상세 문구를 그대로 화면에 노출하지 않고,
        // 개발 환경에서만 콘솔로 원인을 확인할 수 있게 한다(이메일 원문 등 민감정보는 남기지 않음).
        if (process.env.NODE_ENV === "development") {
          console.error("[new-from-email] 분석 요청 실패:", json.error);
        }
        setAnalyzeError(t("aiEmail.paste.analyzeFailed"));
        setAnalyzing(false);
        return;
      }

      setAnalysis(json as EmailAnalysisResult);
      setAnalyzing(false);
      setStep("match");
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[new-from-email] 분석 요청 중 예외:", err);
      }
      setAnalyzeError(t("aiEmail.paste.networkError"));
      setAnalyzing(false);
    }
  }

  function reset() {
    setStep("paste");
    setAnalyzing(false);
    setAnalyzeError(null);
    setAnalysis(null);
    setExistingCompany(null);
  }

  return {
    step,
    setStep,
    analyzing,
    analyzeError,
    analysis,
    existingCompany,
    setExistingCompany,
    handleAnalyze,
    reset,
  };
}

export interface AiMailDrawerProps {
  open: boolean;
  onClose: () => void;
  // Drawer 닫힘 애니메이션이 완전히 끝난 시점에만 호출(components/ui/Drawer.tsx의 onClosed
  // 그대로 전달). AppLayout이 Header AI 버튼 재표시 타이밍을 여기 맞추기 위해 필요.
  onClosed?: () => void;
}

// EmailPasteForm/CompanyMatchPicker/EmailAnalysisReview는 new-from-email 페이지와 동일한
// 컴포넌트를 그대로 가져다 쓴다(내부 로직/저장(handleRegister) 로직 수정 없음).
export default function AiMailDrawer({ open, onClose, onClosed }: AiMailDrawerProps) {
  const t = useT();
  const router = useRouter();
  const flow = useEmailAnalysisFlow();

  function handleClose() {
    flow.reset();
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      onClosed={onClosed}
      title={
        <span className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          {t("common.appName")} AI
        </span>
      }
      width="lg"
    >
      <div className="flex flex-col gap-6">
        <p className="text-sm text-secondary">{t("aiEmail.drawer.description")}</p>

        <nav className="flex items-center gap-2 border-b border-border pb-4">
          {STEPS.map((item, index) => {
            const isActive = item.key === flow.step;
            return (
              <div key={item.key} className="flex items-center gap-2">
                {index > 0 && <span className="h-px w-4 bg-border" aria-hidden="true" />}
                <span
                  className={
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
                    (isActive ? "bg-primary text-white" : "text-secondary")
                  }
                >
                  <span
                    className={
                      "flex h-4 w-4 items-center justify-center rounded-full text-[10px] " +
                      (isActive ? "bg-white/20" : "bg-background")
                    }
                  >
                    {index + 1}
                  </span>
                  {t(item.labelKey)}
                </span>
              </div>
            );
          })}
        </nav>

        {flow.step === "paste" && (
          <EmailPasteForm
            onAnalyze={flow.handleAnalyze}
            loading={flow.analyzing}
            error={flow.analyzeError}
          />
        )}

        {flow.step === "match" && flow.analysis && (
          <CompanyMatchPicker
            suggestedName={flow.analysis.companyName}
            onSelectNew={() => {
              flow.setExistingCompany(null);
              flow.setStep("review");
            }}
            onSelectExisting={(company) => {
              flow.setExistingCompany(company);
              flow.setStep("review");
            }}
          />
        )}

        {flow.step === "review" && flow.analysis && (
          <EmailAnalysisReview
            analysis={flow.analysis}
            existingCompany={flow.existingCompany}
            onBack={() => flow.setStep("match")}
            onDone={(companyId) => {
              flow.reset();
              onClose();
              router.push(`/companies/${companyId}`);
            }}
          />
        )}

        <p className="flex items-start gap-1.5 text-xs text-secondary">
          <Lock size={12} className="mt-0.5 shrink-0" />
          {t("aiEmail.drawer.privacyNotice")}
        </p>
      </div>
    </Drawer>
  );
}
