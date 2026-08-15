"use client";

import MaterialIcon from "@/components/ui/MaterialIcon";
import InlineEditField from "@/components/companies/InlineEditField";
import { companyToFormValues, type Company, type CompanyFormValues } from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { useT } from "@/lib/locale-context";

interface CompanyInfoCardProps {
  company: Company;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "企業情報" 카드.
// 5개 필드 모두 companies 테이블 컬럼이라 updateCompany로 저장한다.
export default function CompanyInfoCard({ company }: CompanyInfoCardProps) {
  const t = useT();
  const { updateCompany } = useCompanies();

  async function saveField(field: keyof CompanyFormValues, value: string) {
    await updateCompany(company.id, { ...companyToFormValues(company), [field]: value });
  }

  async function saveWebsiteUrl(value: string) {
    await saveField("websiteUrl", value);
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
              value={company.location}
              onSave={(v) => saveField("location", v)}
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
              value={company.industry}
              onSave={(v) => saveField("industry", v)}
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
              value={company.source}
              onSave={(v) => saveField("source", v)}
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
              value={company.position}
              onSave={(v) => saveField("position", v)}
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
