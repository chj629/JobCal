"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmailPasteForm from "@/components/companies/EmailPasteForm";
import CompanyMatchPicker from "@/components/companies/CompanyMatchPicker";
import EmailAnalysisReview from "@/components/companies/EmailAnalysisReview";
import Drawer from "@/components/ui/Drawer";
import MaterialIcon from "@/components/ui/MaterialIcon";
import type { Company } from "@/lib/companies";
import type { EmailAnalysisResult } from "@/lib/ai/emailAnalysis";
import { PRO_AI_ANALYSIS_WARNING_THRESHOLD } from "@/lib/ai/analysisUsage";
import {
  notifyAiAnalysisUsageChanged,
  useAiAnalysisUsage,
} from "@/lib/ai/useAiAnalysisUsage";
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
  // 세션이 만료되면 이 경로를 보호하는 middleware(lib/supabase/proxy.ts)가 /login으로
  // 307 리다이렉트하는데, fetch는 리다이렉트를 그대로 따라가 최종적으로 /login 페이지의
  // HTML(status 200)을 받는다 — 이를 일반 네트워크 오류와 구분해 로그인 유도 UI를
  // 보여주기 위한 플래그(아래 handleAnalyze 참고).
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  // 429(일일 사용 한도 초과) 응답의 code 필드("free_limit_exceeded" | "pro_limit_exceeded")를
  // 그대로 옮긴 값 — quota 계산/제한 로직(app/api/ai/analyze-email/route.ts)은 건드리지
  // 않고, 이미 서버가 구분해서 내려주는 값을 화면에서도 구분해 보여주기 위한 용도.
  // null이면 daily-limit 오류가 아니거나 아직 오류가 없는 상태.
  const [dailyLimitPlan, setDailyLimitPlan] = useState<"free" | "pro" | null>(null);
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
  // analyzing(state)는 렌더 이후에만 버튼을 disabled/unmount 처리하므로, 그 렌더가 커밋되기
  // 전에 두 번째 호출이 끼어들 이론적 여지를 막기 위한 동기 가드. AI 분석은 호출당 사용량
  // 1회(Free는 평생 10회 중 1)를 소모하고 OpenAI 비용도 발생시키므로, 중복 호출 시 사용자가
  // 의도치 않게 2회분을 한 번에 잃을 수 있다 — ref는 setState와 달리 즉시(동기) 반영된다.
  const analyzingRef = useRef(false);

  async function handleAnalyze(emailText: string, fromOnboarding = false) {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    if (fromOnboarding) setAnalysisStartedFromOnboarding(true);
    setAnalyzing(true);
    setAnalyzeError(null);
    setIsSessionExpired(false);
    setDailyLimitPlan(null);

    try {
      const response = await fetch("/api/ai/analyze-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailText }),
      });

      // API route는 성공/실패 모두 항상 application/json만 반환한다. content-type이
      // 다르다는 것은(=HTML) middleware가 세션 만료로 /login으로 리다이렉트했고,
      // fetch가 그 리다이렉트를 그대로 따라가 로그인 페이지 HTML(status 200)을 받았다는
      // 뜻이다 — response.json()으로 파싱을 시도하면 SyntaxError가 나서 일반 네트워크
      // 오류로 오인되므로, 파싱 전에 먼저 구분한다.
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        setIsSessionExpired(true);
        setAnalyzeError(t("common.sessionExpired"));
        setAnalyzing(false);
        return;
      }

      const json = await response.json();

      if (!response.ok) {
        // API가 돌려준 에러 코드/상세 문구를 그대로 화면에 노출하지 않고,
        // 개발 환경에서만 콘솔로 원인을 확인할 수 있게 한다(이메일 원문 등 민감정보는 남기지 않음).
        if (process.env.NODE_ENV === "development") {
          console.error("[new-from-email] 분석 요청 실패:", json.error);
        }
        // route.ts가 미들웨어를 거치지 않고 직접 401을 반환하는 경우(예: 미들웨어 통과
        // 직후 세션이 만료된 극단적 타이밍)도 같은 세션 만료 안내로 처리한다. 429(일일
        // 사용 한도 초과)는 기존 그대로 별도 안내를 유지한다.
        if (response.status === 401) {
          setIsSessionExpired(true);
          setAnalyzeError(t("common.sessionExpired"));
        } else if (response.status === 429) {
          // code로 Free/Pro 한도 초과를 구분해 서로 다른 안내를 보여준다. 알 수 없는
          // code(예상치 못한 값)가 오면 기존 일반 한도 초과 문구로 안전하게 폴백한다 —
          // 429의 다른 원인 처리를 바꾸지 않는다.
          if (json.code === "free_limit_exceeded") {
            setDailyLimitPlan("free");
            setAnalyzeError(t("aiEmail.paste.freeLimitDescription"));
          } else if (json.code === "pro_limit_exceeded") {
            setDailyLimitPlan("pro");
            setAnalyzeError(t("aiEmail.paste.proLimitMessage"));
          } else {
            setAnalyzeError(t("aiEmail.paste.dailyLimitReached"));
          }
        } else {
          setAnalyzeError(t("aiEmail.paste.analyzeFailed"));
        }
        setAnalyzing(false);
        return;
      }

      // route가 성공 응답을 반환한 시점에는 원자적 사용량 RPC까지 커밋됐다. 전체 페이지를
      // 새로고침하지 않고 현재 마운트된 Drawer/Settings의 숫자만 다시 읽게 한다.
      notifyAiAnalysisUsageChanged();
      setAnalysis(json as EmailAnalysisResult);
      setAnalyzing(false);
      setStep("match");
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[new-from-email] 분석 요청 중 예외:", err);
      }
      setAnalyzeError(t("aiEmail.paste.networkError"));
      setAnalyzing(false);
    } finally {
      analyzingRef.current = false;
    }
  }

  function reset() {
    setStep("paste");
    setAnalyzing(false);
    setAnalyzeError(null);
    setIsSessionExpired(false);
    setDailyLimitPlan(null);
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
    isSessionExpired,
    dailyLimitPlan,
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
  // 닫힌 Drawer 때문에 플랜/사용량 조회를 만들지 않는다. 열릴 때만 현재 세션 기준으로
  // getUserPlan + RLS 사용량 조회를 하고, 분석 성공 이벤트를 받으면 조용히 갱신한다.
  const { usage } = useAiAnalysisUsage(open);
  const usageRemaining = usage ? Math.max(usage.limit - usage.used, 0) : 0;
  const showFreeUpgradeHint = usage?.plan === "free" && usageRemaining <= 3;
  const showProUsageWarning =
    usage?.plan === "pro" && usage.used >= PRO_AI_ANALYSIS_WARNING_THRESHOLD;
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
        <div className="mb-10 space-y-3">
          <div className="flex items-center gap-3">
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

          {usage?.plan === "free" && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-secondary">
              <span>{t("aiEmail.drawer.usage.free", { used: usage.used, limit: usage.limit })}</span>
              {showFreeUpgradeHint && (
                <Link
                  href="/settings?tab=plan"
                  className="font-[500] text-primary-navy underline underline-offset-2"
                >
                  {t("aiEmail.drawer.usage.freeUpgrade", { remaining: usageRemaining })}
                </Link>
              )}
            </div>
          )}

          {showProUsageWarning && usage && (
            <p className="text-[11px] text-warning">
              {t("aiEmail.drawer.usage.proWarning", { remaining: usageRemaining })}
            </p>
          )}
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
          isSessionExpired={flow.isSessionExpired}
          dailyLimitPlan={flow.dailyLimitPlan}
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
