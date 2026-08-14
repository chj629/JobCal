"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import InlineEditField from "@/components/companies/InlineEditField";
import { companyToFormValues, type Company } from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { useT } from "@/lib/locale-context";

interface MypageInfoCardProps {
  company: Company;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "マイページ情報" 카드.
// マイページURL(mypageUrl)만 실제 companies 컬럼이라 updateCompany로 저장한다.
// ログインID/パスワード/メモ는 docs/database.md의 company_credentials 테이블에 대응하는데,
// "암호화 방식이 확정되기 전까지 비밀번호 저장 기능은 구현하지 않을 수 있다"고 명시돼 있어
// 아직 만들지 않았다. 그래서 이 세 필드는 어떤 경우에도 Supabase에 저장하지 않고
// 로컬 state로만 UI를 구현한다(비밀번호는 특히 평문 저장 위험이 있어 더 신중해야 한다).
export default function MypageInfoCard({ company }: MypageInfoCardProps) {
  const t = useT();
  const { updateCompany } = useCompanies();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [memo, setMemo] = useState("");

  async function saveMypageUrl(value: string) {
    await updateCompany(company.id, { ...companyToFormValues(company), mypageUrl: value });
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-1.5 text-[13px] font-[400] text-stitch-ink">
        <MaterialIcon name="language" size={15} className="text-secondary" />
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
              value={loginId}
              onSave={setLoginId}
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
              value={memo}
              onSave={setMemo}
              type="textarea"
              emptyLabel={t("companies.detail.companyInfo.emptyValue")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
