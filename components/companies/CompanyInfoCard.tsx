"use client";

import { useState } from "react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import InlineEditField from "@/components/companies/InlineEditField";
import { companyToFormValues, type Company } from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { useT } from "@/lib/locale-context";

interface CompanyInfoCardProps {
  company: Company;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "企業情報" 카드.
// 企業URL(websiteUrl)만 실제 companies 테이블 컬럼이라 updateCompany로 저장하고,
// 勤務地/業界/応募経路/応募職種은 대응하는 컬럼이 없어 로컬 state로만 UI를 구현한다.
export default function CompanyInfoCard({ company }: CompanyInfoCardProps) {
  const t = useT();
  const { updateCompany } = useCompanies();
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [source, setSource] = useState("");
  const [position, setPosition] = useState("");

  async function saveWebsiteUrl(value: string) {
    await updateCompany(company.id, { ...companyToFormValues(company), websiteUrl: value });
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
        <MaterialIcon name="domain" size={17} className="text-secondary" />
        {t("companies.detail.companyInfo.title")}
      </h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 pl-6 sm:grid-cols-2">
        <div className="flex items-start gap-4">
          <span className="w-16 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
            {t("companies.detail.companyInfo.location")}
          </span>
          <div className="min-w-0 flex-1">
            <InlineEditField
              value={location}
              onSave={setLocation}
              emptyLabel={t("companies.detail.companyInfo.emptyValue")}
            />
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="w-16 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
            {t("companies.detail.companyInfo.industry")}
          </span>
          <div className="min-w-0 flex-1">
            <InlineEditField
              value={industry}
              onSave={setIndustry}
              emptyLabel={t("companies.detail.companyInfo.emptyValue")}
            />
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="w-16 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
            {t("companies.detail.companyInfo.source")}
          </span>
          <div className="min-w-0 flex-1">
            <InlineEditField
              value={source}
              onSave={setSource}
              emptyLabel={t("companies.detail.companyInfo.emptyValue")}
            />
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="w-16 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
            {t("companies.detail.companyInfo.position")}
          </span>
          <div className="min-w-0 flex-1">
            <InlineEditField
              value={position}
              onSave={setPosition}
              emptyLabel={t("companies.detail.companyInfo.emptyValue")}
            />
          </div>
        </div>
        <div className="flex items-start gap-4">
          <span className="w-16 shrink-0 pt-0.5 text-[11px] font-[400] text-secondary">
            {t("companies.detail.companyInfo.url")}
          </span>
          <div className="min-w-0 flex-1">
            <InlineEditField
              value={company.websiteUrl}
              onSave={saveWebsiteUrl}
              emptyLabel={t("companies.detail.companyInfo.emptyValue")}
              renderDisplay={(value) => (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  // docs/stitch code.html의 URL 필드는 클릭 시 실제 이동 대신 인라인 편집으로
                  // 들어간다(다른 필드와 동일한 클릭=편집 패턴). 그래서 기본 이동만 막고
                  // 클릭 이벤트는 부모 span의 onClick(편집 모드 진입)으로 그대로 넘긴다.
                  onClick={(e) => e.preventDefault()}
                  className="text-primary-navy hover:underline"
                >
                  {value}
                </a>
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
