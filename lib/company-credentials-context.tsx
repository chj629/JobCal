"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  rowToCompanyCredential,
  credentialFormValuesToRow,
  type CompanyCredential,
  type CompanyCredentialRow,
  type CredentialFormValues,
} from "@/lib/companyCredentials";

interface CompanyCredentialsContextValue {
  credentials: CompanyCredential[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // 기업당 credentials 행이 없으면 새로 만들고, 있으면 업데이트한다(기업당 최대 1건).
  saveCredential: (companyId: string, values: CredentialFormValues) => Promise<boolean>;
}

const CompanyCredentialsContext = createContext<CompanyCredentialsContextValue | null>(null);

export function CompanyCredentialsProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [credentials, setCredentials] = useState<CompanyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setCredentials([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error: fetchError } = await supabase
      .from("company_credentials")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setCredentials(((data ?? []) as CompanyCredentialRow[]).map(rowToCompanyCredential));
    setLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      await load();
    }

    initialLoad();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) load();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function saveCredential(companyId: string, values: CredentialFormValues) {
    if (!userId) return false;

    const existing = credentials.find((c) => c.companyId === companyId);

    if (existing) {
      const { data, error: updateError } = await supabase
        .from("company_credentials")
        .update(credentialFormValuesToRow(values))
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        setError(updateError.message);
        return false;
      }

      setError(null);
      const updated = rowToCompanyCredential(data as CompanyCredentialRow);
      setCredentials((prev) => prev.map((c) => (c.id === existing.id ? updated : c)));
      return true;
    }

    const { data, error: insertError } = await supabase
      .from("company_credentials")
      .insert({
        user_id: userId,
        company_id: companyId,
        ...credentialFormValuesToRow(values),
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    setError(null);
    setCredentials((prev) => [...prev, rowToCompanyCredential(data as CompanyCredentialRow)]);
    return true;
  }

  return (
    <CompanyCredentialsContext.Provider
      value={{ credentials, loading, error, refresh: load, saveCredential }}
    >
      {children}
    </CompanyCredentialsContext.Provider>
  );
}

export function useCompanyCredentials() {
  const context = useContext(CompanyCredentialsContext);
  if (!context) {
    throw new Error("useCompanyCredentials must be used within a CompanyCredentialsProvider");
  }
  return context;
}
