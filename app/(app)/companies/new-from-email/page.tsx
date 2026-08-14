"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import EmailPasteForm from "@/components/companies/EmailPasteForm";
import CompanyMatchPicker from "@/components/companies/CompanyMatchPicker";
import EmailAnalysisReview from "@/components/companies/EmailAnalysisReview";
import { useEmailAnalysisFlow } from "@/components/ai/AiMailDrawer";
import { useT } from "@/lib/locale-context";

export default function NewFromEmailPage() {
  const t = useT();
  const router = useRouter();
  const {
    step,
    setStep,
    analyzing,
    analyzeError,
    analysis,
    existingCompany,
    setExistingCompany,
    handleAnalyze,
  } = useEmailAnalysisFlow();

  return (
    <div>
      <div className="mx-auto max-w-[720px] px-8 pt-8">
        <Link href="/companies" className="text-sm text-secondary hover:text-foreground">
          {t("companies.detail.backToList")}
        </Link>
      </div>

      <div className="mx-auto max-w-[720px] px-8 py-8">
        {step === "paste" && (
          <EmailPasteForm onAnalyze={handleAnalyze} loading={analyzing} error={analyzeError} />
        )}

        {step === "match" && analysis && (
          <CompanyMatchPicker
            suggestedName={analysis.companyName}
            onBack={() => setStep("paste")}
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
    </div>
  );
}
