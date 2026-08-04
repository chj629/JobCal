"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmailPasteForm from "@/components/companies/EmailPasteForm";
import CompanyMatchPicker from "@/components/companies/CompanyMatchPicker";
import EmailAnalysisReview from "@/components/companies/EmailAnalysisReview";
import type { Company } from "@/lib/companies";
import type { EmailAnalysisResult } from "@/lib/ai/emailAnalysis";

type Step = "paste" | "match" | "review";

export default function NewFromEmailPage() {
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
        setAnalyzeError(json.error ?? "분석에 실패했습니다.");
        setAnalyzing(false);
        return;
      }

      setAnalysis(json as EmailAnalysisResult);
      setAnalyzing(false);
      setStep("match");
    } catch {
      setAnalyzeError("분석 요청 중 오류가 발생했습니다.");
      setAnalyzing(false);
    }
  }

  return (
    <div>
      <div className="mx-auto max-w-[720px] px-8 pt-8">
        <Link href="/companies" className="text-sm text-secondary hover:text-foreground">
          ← 기업 목록으로
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
