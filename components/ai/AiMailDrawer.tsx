"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EmailPasteForm from "@/components/companies/EmailPasteForm";
import CompanyMatchPicker from "@/components/companies/CompanyMatchPicker";
import EmailAnalysisReview from "@/components/companies/EmailAnalysisReview";
import Drawer from "@/components/ui/Drawer";
import MaterialIcon from "@/components/ui/MaterialIcon";
import type { Company } from "@/lib/companies";
import type { EmailAnalysisResult } from "@/lib/ai/emailAnalysis";
import { useT } from "@/lib/locale-context";

type Step = "paste" | "match" | "review" | "complete";

// docs/stitch/AI Drawer/*의 상단 최소 스텝 표시(1 메일입력 - 2 - 3). complete 단계는
// 대응 screen.png에 스텝 표시가 아예 없어(중앙 정렬된 완료 화면) STEPS에 포함하지 않는다.
const STEPS: { key: Exclude<Step, "complete">; labelKey: string }[] = [
  { key: "paste", labelKey: "aiEmail.drawer.steps.paste" },
  { key: "match", labelKey: "aiEmail.drawer.steps.match" },
  { key: "review", labelKey: "aiEmail.drawer.steps.review" },
];

interface RegisteredCompany {
  id: string;
  name: string;
}

// app/(app)/companies/new-from-email/page.tsx와 Drawer가 동일한 4단계 흐름을 쓰므로,
// 상태와 handleAnalyze(OpenAI API 호출) 로직을 이 훅 하나로 두고 두 곳에서 그대로 재사용한다.
// 로직 자체는 기존 page.tsx에 있던 것을 옮긴 것일 뿐 내용은 바뀌지 않았다.
export function useEmailAnalysisFlow() {
  const t = useT();
  const [step, setStep] = useState<Step>("paste");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<EmailAnalysisResult | null>(null);
  const [existingCompany, setExistingCompany] = useState<Company | null>(null);
  const [registeredCompany, setRegisteredCompany] = useState<RegisteredCompany | null>(null);
  // "이 분석이 onboarding Step 2에서 시작됐는지"를 기억하는 상태 — AI onboarding Step 3
  // (AiMailDrawer.tsx)가 review 화면에서 등록 버튼을 spotlight할지 판단하는 데 쓰인다.
  // AiMailDrawer.tsx가 handleAnalyze를 호출하는 순간(=클릭 시점) onboardingStep2Active가
  // true였을 때만 true로 설정되고, match→review 단계를 거치는 동안에도 그대로 유지된다
  // (Step2 자체는 그 클릭과 동시에 이미 종료되어 onboardingStep2Active가 곧장 false로
  // 바뀌므로, review 화면에 도달한 시점엔 그 값을 더 이상 참조할 수 없어 별도로 기억해
  // 둬야 한다). new-from-email 페이지는 fromOnboarding 인자를 전혀 넘기지 않으므로
  // 항상 false로 남아 그 페이지에는 영향이 없다.
  const [analysisStartedFromOnboarding, setAnalysisStartedFromOnboarding] = useState(false);

  async function handleAnalyze(emailText: string, fromOnboarding = false) {
    if (fromOnboarding) setAnalysisStartedFromOnboarding(true);
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
        // 429(일일 사용 한도 초과)만 기존 일반 오류 문구와 구분해 별도 안내를 보여준다.
        setAnalyzeError(
          response.status === 429
            ? t("aiEmail.paste.dailyLimitReached")
            : t("aiEmail.paste.analyzeFailed")
        );
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
    setRegisteredCompany(null);
    setAnalysisStartedFromOnboarding(false);
  }

  return {
    step,
    setStep,
    analyzing,
    analyzeError,
    analysis,
    existingCompany,
    setExistingCompany,
    registeredCompany,
    setRegisteredCompany,
    analysisStartedFromOnboarding,
    setAnalysisStartedFromOnboarding,
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
  // AI onboarding Step 1의 CTA(Header)를 누른 직후 true가 되어, "메일 입력" 단계의
  // 실제 textarea를 대상으로 하는 Step 2 데모/spotlight를 보여준다. app/(app)/layout.tsx가
  // 소유한 상태를 그대로 받아 flow.step === "paste"일 때만 EmailPasteForm으로 넘긴다.
  onboardingStep2Active?: boolean;
  onOnboardingStep2Dismiss?: () => void;
}

// EmailPasteForm/CompanyMatchPicker/EmailAnalysisReview는 new-from-email 페이지와 동일한
// 컴포넌트를 그대로 가져다 쓴다(내부 로직/저장(handleRegister) 로직 수정 없음).
export default function AiMailDrawer({
  open,
  onClose,
  onClosed,
  onboardingStep2Active = false,
  onOnboardingStep2Dismiss,
}: AiMailDrawerProps) {
  const t = useT();
  const router = useRouter();
  const flow = useEmailAnalysisFlow();
  // Drawer의 고정 footer 영역 DOM 노드. 각 스텝 컴포넌트가 이 노드로 자신의 버튼을
  // portal 렌더링해, content 스크롤과 무관하게 항상 화면 하단에 보이게 한다.
  const [footerEl, setFooterEl] = useState<HTMLDivElement | null>(null);
  // 실제 "登録" 버튼(EmailAnalysisReview.tsx) — AI onboarding Step 3가 이 버튼 자체를
  // spotlight한다.
  const registerButtonRef = useRef<HTMLButtonElement>(null);

  function handleClose() {
    flow.reset();
    // Drawer를 닫으면(예: onboarding 데모 도중 X 클릭) Step 2도 함께 종료해
    // 다음에 Drawer를 다시 열었을 때 엉뚱한 phase로 남아있지 않게 한다.
    onOnboardingStep2Dismiss?.();
    onClose();
  }

  function handleViewCompany() {
    const company = flow.registeredCompany;
    flow.reset();
    onClose();
    if (company) router.push(`/companies/${company.id}`);
  }

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      onClosed={onClosed}
      title={
        <span className="flex items-center gap-2 text-primary-navy">
          <MaterialIcon name="auto_awesome" size={20} />
          <span className="text-stitch-ink">{t("common.appName")} AI</span>
        </span>
      }
      width="lg"
      footer={
        flow.step === "complete" && flow.registeredCompany ? (
          // steps 1~3과 마찬가지로 완료 화면 버튼도 고정 footer 영역에 둬서 스크롤과
          // 무관하게 항상 화면에 보이게 한다(이전에는 content 안에서 h-full로 중앙
          // 정렬만 하고 있어, 뷰포트가 낮으면 버튼이 잘릴 수 있었다).
          <div className="flex w-full flex-col gap-4">
            <button
              type="button"
              onClick={handleViewCompany}
              className="w-full rounded-full bg-primary-navy py-4 text-[14px] font-[500] text-white transition-all hover:opacity-90"
            >
              {t("aiEmail.complete.viewCompany")}
            </button>
            <button
              type="button"
              onClick={flow.reset}
              className="w-full rounded-full border border-stitch-border py-4 text-[14px] font-[500] text-stitch-ink transition-all hover:bg-stitch-bg"
            >
              {t("aiEmail.complete.analyzeAnother")}
            </button>
          </div>
        ) : // 분석 로딩 중(EmailPasteForm이 스피너만 보여주는 동안)에는 footer 버튼이 없으므로
        // 빈 테두리 박스가 보이지 않도록 이때도 영역 자체를 렌더링하지 않는다.
        flow.step !== "complete" && !flow.analyzing ? (
          <div ref={setFooterEl} className="flex gap-3" />
        ) : undefined
      }
    >
      {flow.step !== "complete" && (
        // docs/stitch/AI Drawer/*의 최소 스텝 표시. 진행 중인 단계만 원+라벨을 보여주고,
        // 나머지는 옅은 원만 남긴다(완료 여부와 무관하게 동일 스타일 — Stitch도 구분 없음).
        <div className="mb-10 flex items-center gap-3">
          {STEPS.map((item, index) => {
            const isActive = item.key === flow.step;
            return (
              <div key={item.key} className="flex items-center gap-3">
                {index > 0 && <span className="h-px w-8 bg-stitch-border" aria-hidden="true" />}
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-[500] " +
                      (isActive
                        ? "bg-primary-navy text-white"
                        : "border border-stitch-border bg-stitch-bg text-secondary")
                    }
                  >
                    {index + 1}
                  </span>
                  {isActive && (
                    <span className="text-[13px] font-[500] text-primary-navy">
                      {t(item.labelKey)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {flow.step === "paste" && (
        <EmailPasteForm
          // "이 분석이 onboarding Step 2에서 시작됐는지"는 이 클릭 시점의
          // onboardingStep2Active 값으로 판별해 flow.handleAnalyze에 넘긴다 — 클릭과
          // 동시에 Step 2 자체는 곧장 종료되어(onboardingStep2Active가 false로 바뀌어)
          // review 화면에 도달했을 땐 이 값을 더 이상 참조할 수 없으므로,
          // analysisStartedFromOnboarding(useEmailAnalysisFlow)이 그 판단을 기억해 둔다.
          onAnalyze={(emailText) => flow.handleAnalyze(emailText, onboardingStep2Active)}
          loading={flow.analyzing}
          error={flow.analyzeError}
          footerContainer={footerEl}
          showOnboardingStep2={onboardingStep2Active}
          onOnboardingStep2Dismiss={onOnboardingStep2Dismiss}
        />
      )}

      {flow.step === "match" && flow.analysis && (
        <CompanyMatchPicker
          suggestedName={flow.analysis.companyName}
          onBack={() => flow.setStep("paste")}
          onSelectNew={() => {
            flow.setExistingCompany(null);
            flow.setStep("review");
          }}
          onSelectExisting={(company) => {
            flow.setExistingCompany(company);
            flow.setStep("review");
          }}
          footerContainer={footerEl}
        />
      )}

      {flow.step === "review" && flow.analysis && (
        <EmailAnalysisReview
          analysis={flow.analysis}
          existingCompany={flow.existingCompany}
          onBack={() => flow.setStep("match")}
          onDone={(companyId, companyName) => {
            flow.setRegisteredCompany({ id: companyId, name: companyName });
            flow.setStep("complete");
          }}
          footerContainer={footerEl}
          showOnboardingStep3={flow.analysisStartedFromOnboarding}
          registerButtonRef={registerButtonRef}
          onOnboardingStep3Dismiss={() => flow.setAnalysisStartedFromOnboarding(false)}
        />
      )}

      {flow.step === "complete" && flow.registeredCompany && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
            <MaterialIcon name="check_circle" size={40} filled className="text-success" />
          </div>
          <div className="space-y-4">
            <h3 className="text-[28px] font-[500] tracking-tight text-stitch-ink">
              {t("aiEmail.complete.title")}
            </h3>
            <p className="text-[16px] text-secondary">{flow.registeredCompany.name}</p>
          </div>
        </div>
      )}
    </Drawer>
  );
}
