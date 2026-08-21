"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { handleSupabaseError } from "@/lib/supabase/errorHandling";
import {
  rowToCompany,
  companyFormValuesToRow,
  type Company,
  type CompanyFormValues,
  type CompanyRow,
} from "@/lib/companies";

interface CompaniesContextValue {
  companies: Company[];
  loading: boolean;
  error: string | null;
  addCompany: (values: CompanyFormValues) => Promise<Company | null>;
  updateCompany: (id: string, values: CompanyFormValues) => Promise<boolean>;
  deleteCompany: (id: string) => Promise<boolean>;
}

const CompaniesContext = createContext<CompaniesContextValue | null>(null);

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setUserId(null);
        setCompanies([]);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data, error: fetchError } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: true });

      if (!isMounted) return;

      if (fetchError) {
        await handleSupabaseError(fetchError.message, setError);
        setLoading(false);
        return;
      }

      setCompanies(((data ?? []) as CompanyRow[]).map(rowToCompany));
      setLoading(false);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // USER_UPDATED(예: user_metadata만 바꾸는 supabase.auth.updateUser 호출 — AI onboarding
      // "본 것으로 표시", 언어/표시명 설정 등)와 TOKEN_REFRESHED는 로그인한 사용자나 그
      // 데이터가 바뀐 게 아니므로 재조회할 필요가 없다. 이걸 걸러내지 않으면 그런 호출마다
      // companies를 포함한 전체 데이터가 다시 로딩되며 화면이 깜빡이듯 리셋되어 보였다.
      if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      load();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function addCompany(values: CompanyFormValues) {
    if (!userId) return null;

    const { data, error: insertError } = await supabase
      .from("companies")
      .insert({ user_id: userId, ...companyFormValuesToRow(values) })
      .select()
      .single();

    if (insertError) {
      await handleSupabaseError(insertError.message, setError);
      return null;
    }

    setError(null);
    const created = rowToCompany(data as CompanyRow);
    setCompanies((prev) => [...prev, created]);
    return created;
  }

  async function updateCompany(id: string, values: CompanyFormValues) {
    if (!userId) return false;

    const { data, error: updateError } = await supabase
      .from("companies")
      .update(companyFormValuesToRow(values))
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      await handleSupabaseError(updateError.message, setError);
      return false;
    }

    setError(null);
    const updated = rowToCompany(data as CompanyRow);
    setCompanies((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return true;
  }

  async function deleteCompany(id: string) {
    if (!userId) return false;

    const { error: deleteError } = await supabase.from("companies").delete().eq("id", id);

    if (deleteError) {
      await handleSupabaseError(deleteError.message, setError);
      return false;
    }

    setError(null);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    return true;
  }

  return (
    <CompaniesContext.Provider
      value={{ companies, loading, error, addCompany, updateCompany, deleteCompany }}
    >
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
