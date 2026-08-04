"use client";

import { useMemo, useState } from "react";
import { useCompanies } from "@/lib/companies-context";
import type { Company } from "@/lib/companies";

interface CompanyMatchPickerProps {
  suggestedName: string | null;
  onSelectNew: () => void;
  onSelectExisting: (company: Company) => void;
}

// 이메일에서 추출한 기업명이 기존에 등록된 기업일 수 있으므로, 자동 연결 없이
// 사용자가 "새 기업으로 등록" 또는 "기존 기업 선택" 중 하나를 직접 고르게 한다.
export default function CompanyMatchPicker({
  suggestedName,
  onSelectNew,
  onSelectExisting,
}: CompanyMatchPickerProps) {
  const { companies } = useCompanies();
  const [search, setSearch] = useState(suggestedName ?? "");

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return companies.filter((company) => company.name.toLowerCase().includes(query));
  }, [companies, search]);

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      <h1 className="text-[20px] font-semibold text-foreground">기업 선택</h1>
      <p className="mt-1 text-sm text-secondary">
        {suggestedName
          ? `추출된 기업명: "${suggestedName}". 기존에 등록한 기업이면 아래에서 선택하고, 아니면 새로 등록하세요.`
          : "이메일에서 기업명을 찾지 못했습니다. 기존 기업을 검색하거나 새로 등록하세요."}
      </p>

      <div className="mt-6 rounded-[10px] border border-border bg-card p-6">
        <label className="mb-1 block text-sm text-secondary">기존 기업 검색</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="기업명 검색"
          className="h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
        />

        {search.trim() && (
          <div className="mt-4 flex flex-col gap-2">
            {matches.length === 0 ? (
              <p className="py-4 text-center text-sm text-secondary">일치하는 기업이 없습니다.</p>
            ) : (
              matches.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => onSelectExisting(company)}
                  className="flex items-center justify-between rounded-[10px] border border-border px-4 py-3 text-left text-sm hover:border-primary"
                >
                  <span className="font-medium text-foreground">{company.name}</span>
                  <span className="text-xs text-primary">이 기업 선택</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onSelectNew}
        className="mt-4 h-10 w-full rounded-[10px] border border-border bg-card text-sm font-medium text-foreground hover:bg-background"
      >
        새 기업으로 등록
      </button>
    </div>
  );
}
