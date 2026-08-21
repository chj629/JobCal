"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { handleSupabaseError } from "@/lib/supabase/errorHandling";
import { rowToNextAction, type NextAction, type NextActionRow } from "@/lib/nextActions";

interface NextActionsContextValue {
  actions: NextAction[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addAction: (companyId: string, text: string, dueLabel?: string) => Promise<boolean>;
  updateAction: (id: string, updates: { text?: string; dueLabel?: string }) => Promise<boolean>;
  toggleAction: (id: string, done: boolean) => Promise<boolean>;
  deleteAction: (id: string) => Promise<boolean>;
}

const NextActionsContext = createContext<NextActionsContextValue | null>(null);

export function NextActionsProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [actions, setActions] = useState<NextAction[]>([]);
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
      setActions([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error: fetchError } = await supabase
      .from("next_actions")
      .select("*")
      .order("created_at", { ascending: true });

    if (fetchError) {
      await handleSupabaseError(fetchError.message, setError);
      setLoading(false);
      return;
    }

    setActions(((data ?? []) as NextActionRow[]).map(rowToNextAction));
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

  async function addAction(companyId: string, text: string, dueLabel?: string) {
    if (!userId) return false;

    const { data, error: insertError } = await supabase
      .from("next_actions")
      .insert({
        user_id: userId,
        company_id: companyId,
        text: text.trim(),
        due_label: dueLabel?.trim() ?? "",
      })
      .select()
      .single();

    if (insertError) {
      await handleSupabaseError(insertError.message, setError);
      return false;
    }

    setError(null);
    setActions((prev) => [...prev, rowToNextAction(data as NextActionRow)]);
    return true;
  }

  async function updateAction(id: string, updates: { text?: string; dueLabel?: string }) {
    if (!userId) return false;

    const payload: { text?: string; due_label?: string } = {};
    if (updates.text !== undefined) payload.text = updates.text.trim();
    if (updates.dueLabel !== undefined) payload.due_label = updates.dueLabel.trim();

    const { data, error: updateError } = await supabase
      .from("next_actions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      await handleSupabaseError(updateError.message, setError);
      return false;
    }

    setError(null);
    const updated = rowToNextAction(data as NextActionRow);
    setActions((prev) => prev.map((action) => (action.id === id ? updated : action)));
    return true;
  }

  async function deleteAction(id: string) {
    if (!userId) return false;

    const { error: deleteError } = await supabase.from("next_actions").delete().eq("id", id);

    if (deleteError) {
      await handleSupabaseError(deleteError.message, setError);
      return false;
    }

    setError(null);
    setActions((prev) => prev.filter((action) => action.id !== id));
    return true;
  }

  async function toggleAction(id: string, done: boolean) {
    if (!userId) return false;

    const { data, error: updateError } = await supabase
      .from("next_actions")
      .update({ done })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      await handleSupabaseError(updateError.message, setError);
      return false;
    }

    setError(null);
    const updated = rowToNextAction(data as NextActionRow);
    setActions((prev) => prev.map((action) => (action.id === id ? updated : action)));
    return true;
  }

  return (
    <NextActionsContext.Provider
      value={{ actions, loading, error, refresh: load, addAction, updateAction, toggleAction, deleteAction }}
    >
      {children}
    </NextActionsContext.Provider>
  );
}

export function useNextActions() {
  const context = useContext(NextActionsContext);
  if (!context) {
    throw new Error("useNextActions must be used within a NextActionsProvider");
  }
  return context;
}
