"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { handleSupabaseError } from "@/lib/supabase/errorHandling";
import {
  rowToCompanyContact,
  contactFormValuesToRow,
  type CompanyContact,
  type CompanyContactRow,
  type ContactFormValues,
} from "@/lib/companyContacts";

interface CompanyContactsContextValue {
  contacts: CompanyContact[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addContact: (companyId: string, values: ContactFormValues) => Promise<boolean>;
  updateContact: (id: string, values: ContactFormValues) => Promise<boolean>;
  deleteContact: (id: string) => Promise<boolean>;
}

const CompanyContactsContext = createContext<CompanyContactsContextValue | null>(null);

export function CompanyContactsProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
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
      setContacts([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error: fetchError } = await supabase
      .from("company_contacts")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      await handleSupabaseError(fetchError.message, setError);
      setLoading(false);
      return;
    }

    setContacts(((data ?? []) as CompanyContactRow[]).map(rowToCompanyContact));
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
    } = supabase.auth.onAuthStateChange((event) => {
      // lib/companies-context.tsx와 동일한 이유로 USER_UPDATED/TOKEN_REFRESHED는 재조회하지
      // 않는다 — user_metadata만 바뀌는 호출(예: AI onboarding 완료 표시)마다 전체 데이터가
      // 다시 로딩되며 화면이 리셋되듯 깜빡이는 문제를 막는다.
      if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      if (isMounted) load();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function addContact(companyId: string, values: ContactFormValues) {
    if (!userId) return false;

    const { data, error: insertError } = await supabase
      .from("company_contacts")
      .insert({
        user_id: userId,
        company_id: companyId,
        ...contactFormValuesToRow(values),
      })
      .select()
      .single();

    if (insertError) {
      await handleSupabaseError(insertError.message, setError);
      return false;
    }

    setError(null);
    setContacts((prev) => [...prev, rowToCompanyContact(data as CompanyContactRow)]);
    return true;
  }

  async function updateContact(id: string, values: ContactFormValues) {
    if (!userId) return false;

    const { data, error: updateError } = await supabase
      .from("company_contacts")
      .update(contactFormValuesToRow(values))
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      await handleSupabaseError(updateError.message, setError);
      return false;
    }

    setError(null);
    const updated = rowToCompanyContact(data as CompanyContactRow);
    setContacts((prev) => prev.map((contact) => (contact.id === id ? updated : contact)));
    return true;
  }

  async function deleteContact(id: string) {
    if (!userId) return false;

    const { error: deleteError } = await supabase.from("company_contacts").delete().eq("id", id);

    if (deleteError) {
      await handleSupabaseError(deleteError.message, setError);
      return false;
    }

    setError(null);
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
    return true;
  }

  return (
    <CompanyContactsContext.Provider
      value={{ contacts, loading, error, refresh: load, addContact, updateContact, deleteContact }}
    >
      {children}
    </CompanyContactsContext.Provider>
  );
}

export function useCompanyContacts() {
  const context = useContext(CompanyContactsContext);
  if (!context) {
    throw new Error("useCompanyContacts must be used within a CompanyContactsProvider");
  }
  return context;
}
