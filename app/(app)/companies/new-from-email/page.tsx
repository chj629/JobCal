"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmailPasteForm from "@/components/companies/EmailPasteForm";
import CompanyMatchPicker from "@/components/companies/CompanyMatchPicker";
import EmailAnalysisReview from "@/components/companies/EmailAnalysisReview";
import type { Company } from "@/lib/companies";
import type { EmailAnalysisResult } from "@/lib/ai/emailAnalysis";
import { useT } from "@/lib/locale-context";

type Step = "paste" | "match" | "review";

export default function NewFromEmailPage() {
  const t = useT();
  const router = useRouter();
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

  return (
    <div>
      <div className="mx-auto max-w-[720px] px-8 pt-8">
        <Link href="/companies" className="text-sm text-secondary hover:text-foreground">
          {t("companies.detail.backToList")}
        </Link>
      </div>

      {step === "paste" && (
        <EmailPasteForm onAnalyze={handleAnalyze} loading={analyzing} error={analyzeError} />
      )}

      {step === "match" && analysis && (
        <CompanyMatchPicker
          suggestedName={analysis.companyName}
          onSelectNew={() => {
            setExistingCompany(null);
            setStep("review");
          }}
          onSelectExisting={(company) => {
            setExistingCompany(company);
            setStep("review");
          }}
        />
      )}

      {step === "review" && analysis && (
        <EmailAnalysisReview
          analysis={analysis}
          existingCompany={existingCompany}
          onBack={() => setStep("match")}
          onDone={(companyId) => router.push(`/companies/${companyId}`)}
        />
      )}
    </div>
  );
}
