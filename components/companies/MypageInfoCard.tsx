"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import InlineEditField from "@/components/companies/InlineEditField";
import { companyToFormValues, type Company } from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { createEmptyCredentialFormValues, credentialToFormValues } from "@/lib/companyCredentials";
import { useCompanyCredentials } from "@/lib/company-credentials-context";
import { useT } from "@/lib/locale-context";

interface MypageInfoCardProps {
  company: Company;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "マイページ情報" 카드.
// マイページURL(mypageUrl)은 companies 컬럼, ログインID/メモ는 company_credentials 테이블에
// 저장한다. パスワード는 "암호화 방식이 확정되기 전까지 비밀번호 저장 기능은 구현하지
// 않을 수 있다"는 방침에 따라 이번에도 Supabase에 저장하지 않고 로컬 state로만 둔다.
export default function MypageInfoCard({ company }: MypageInfoCardProps) {
  const t = useT();
  const { updateCompany } = useCompanies();
  const { credentials, saveCredential } = useCompanyCredentials();
  const [password, setPassword] = useState("");

  const credential = credentials.find((c) => c.companyId === company.id);
  const credentialValues = credential ? credentialToFormValues(credential) : createEmptyCredentialFormValues();

  async function saveMypageUrl(value: string) {
    await updateCompany(company.id, { ...companyToFormValues(company), mypageUrl: value });
  }

  async function saveLoginId(value: string) {
    await saveCredential(company.id, { ...credentialValues, loginId: value });
  }

  async function saveMemo(value: string) {
    await saveCredential(company.id, { ...credentialValues, loginMemo: value });
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="language" size={17} className="text-secondary" />
        {t("companies.detail.mypageInfo.title")}
      </h2>
      <div className="space-y-4 pl-6">
        <div className="flex items-start gap-4">
          <span className="w-24 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
            {t("companies.detail.mypageInfo.url")}
          </span>
          <div className="min-w-0 flex-1">
            <InlineEditField
              value={company.mypageUrl}
              onSave={saveMypageUrl}
              emptyLabel={t("companies.detail.companyInfo.emptyValue")}
              renderDisplay={(value) => (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.preventDefault()}
                  className="break-all text-primary-navy hover:underline"
                >
                  {value}
                </a>
              )}
            />
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="w-24 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
            {t("companies.detail.mypageInfo.loginId")}
          </span>
          <div className="min-w-0 flex-1">
            <InlineEditField
              value={credentialValues.loginId}
              onSave={saveLoginId}
              emptyLabel={t("companies.detail.companyInfo.emptyValue")}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="w-24 shrink-0 text-[11px] font-[400] text-secondary">
            {t("companies.detail.mypageInfo.password")}
          </span>
          <div className="min-w-0 flex-1">
            <InlineEditField
              value={password}
              onSave={setPassword}
              type="password"
              emptyLabel={t("companies.detail.companyInfo.emptyValue")}
            />
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="w-24 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
            {t("companies.detail.mypageInfo.memo")}
          </span>
          <div className="min-w-0 flex-1">
            <InlineEditField
              value={credentialValues.loginMemo}
              onSave={saveMemo}
              type="textarea"
              emptyLabel={t("companies.detail.companyInfo.emptyValue")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
