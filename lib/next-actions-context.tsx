"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { rowToNextAction, type NextAction, type NextActionRow } from "@/lib/nextActions";

interface NextActionsContextValue {
  actions: NextAction[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addAction: (companyId: string, text: string) => Promise<boolean>;
  toggleAction: (id: string, done: boolean) => Promise<boolean>;
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
      setError(fetchError.message);
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
    } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) load();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function addAction(companyId: string, text: string) {
    if (!userId) return false;

    const { data, error: insertError } = await supabase
      .from("next_actions")
      .insert({
        user_id: userId,
        company_id: companyId,
        text: text.trim(),
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    setError(null);
    setActions((prev) => [...prev, rowToNextAction(data as NextActionRow)]);
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
      setError(updateError.message);
      return false;
    }

    setError(null);
    const updated = rowToNextAction(data as NextActionRow);
    setActions((prev) => prev.map((action) => (action.id === id ? updated : action)));
    return true;
  }

  return (
    <NextActionsContext.Provider
      value={{ actions, loading, error, refresh: load, addAction, toggleAction }}
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
