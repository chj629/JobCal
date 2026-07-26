"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
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
  addCompany: (values: CompanyFormValues) => Promise<boolean>;
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
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setCompanies(((data ?? []) as CompanyRow[]).map(rowToCompany));
      setLoading(false);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function addCompany(values: CompanyFormValues) {
    if (!userId) return false;

    const { data, error: insertError } = await supabase
      .from("companies")
      .insert({ user_id: userId, ...companyFormValuesToRow(values) })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    setError(null);
    setCompanies((prev) => [...prev, rowToCompany(data as CompanyRow)]);
    return true;
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
      setError(updateError.message);
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
      setError(deleteError.message);
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
