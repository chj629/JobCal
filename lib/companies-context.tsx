"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { MOCK_COMPANIES, type Company, type CompanyFormValues } from "@/lib/companies";

interface CompaniesContextValue {
  companies: Company[];
  addCompany: (values: CompanyFormValues) => void;
  updateCompany: (id: string, values: CompanyFormValues) => void;
  deleteCompany: (id: string) => void;
}

const CompaniesContext = createContext<CompaniesContextValue | null>(null);

function toCompanyFields(values: CompanyFormValues) {
  return {
    name: values.name.trim(),
    status: values.status,
    currentStep: values.currentStep,
    priority: values.priority,
    nextSchedule: values.nextSchedule.trim() === "" ? null : values.nextSchedule,
    websiteUrl: values.websiteUrl.trim(),
    mypageUrl: values.mypageUrl.trim(),
    memo: values.memo.trim(),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);

  function addCompany(values: CompanyFormValues) {
    setCompanies((prev) => {
      const nextId = (Math.max(0, ...prev.map((c) => Number(c.id))) + 1).toString();
      return [...prev, { id: nextId, ...toCompanyFields(values) }];
    });
  }

  function updateCompany(id: string, values: CompanyFormValues) {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...toCompanyFields(values) } : c))
    );
  }

  function deleteCompany(id: string) {
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <CompaniesContext.Provider value={{ companies, addCompany, updateCompany, deleteCompany }}>
      {children}
    </CompaniesContext.Provider>
  );
}

export function useCompanies() {
  const context = useContext(CompaniesContext);
  if (!context) {
    throw new Error("useCompanies must be used within a CompaniesProvider");
  }
  return context;
}
