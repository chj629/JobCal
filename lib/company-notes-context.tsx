"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { handleSupabaseError } from "@/lib/supabase/errorHandling";
import {
  rowToCompanyNote,
  noteFormValuesToRow,
  type CompanyNote,
  type CompanyNoteRow,
  type NoteFormValues,
} from "@/lib/companyNotes";

interface CompanyNotesContextValue {
  notes: CompanyNote[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addNote: (companyId: string, values: NoteFormValues) => Promise<boolean>;
  updateNote: (id: string, values: NoteFormValues) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
}

const CompanyNotesContext = createContext<CompanyNotesContextValue | null>(null);

export function CompanyNotesProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [notes, setNotes] = useState<CompanyNote[]>([]);
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
      setNotes([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error: fetchError } = await supabase
      .from("company_notes")
      .select("*")
      .order("position", { ascending: true });

    if (fetchError) {
      await handleSupabaseError(fetchError.message, setError);
      setLoading(false);
      return;
    }

    setNotes(((data ?? []) as CompanyNoteRow[]).map(rowToCompanyNote));
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

  async function addNote(companyId: string, values: NoteFormValues) {
    if (!userId) return false;

    const companyNotes = notes.filter((note) => note.companyId === companyId);
    const nextPosition =
      companyNotes.length === 0 ? 0 : Math.max(...companyNotes.map((note) => note.position)) + 1;

    const { data, error: insertError } = await supabase
      .from("company_notes")
      .insert({
        user_id: userId,
        company_id: companyId,
        position: nextPosition,
        ...noteFormValuesToRow(values),
      })
      .select()
      .single();

    if (insertError) {
      await handleSupabaseError(insertError.message, setError);
      return false;
    }

    setError(null);
    setNotes((prev) => [...prev, rowToCompanyNote(data as CompanyNoteRow)]);
    return true;
  }

  async function updateNote(id: string, values: NoteFormValues) {
    if (!userId) return false;

    const { data, error: updateError } = await supabase
      .from("company_notes")
      .update(noteFormValuesToRow(values))
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      await handleSupabaseError(updateError.message, setError);
      return false;
    }

    setError(null);
    const updated = rowToCompanyNote(data as CompanyNoteRow);
    setNotes((prev) => prev.map((note) => (note.id === id ? updated : note)));
    return true;
  }

  async function deleteNote(id: string) {
    if (!userId) return false;

    const { error: deleteError } = await supabase.from("company_notes").delete().eq("id", id);

    if (deleteError) {
      await handleSupabaseError(deleteError.message, setError);
      return false;
    }

    setError(null);
    setNotes((prev) => prev.filter((note) => note.id !== id));
    return true;
  }

  return (
    <CompanyNotesContext.Provider
      value={{ notes, loading, error, refresh: load, addNote, updateNote, deleteNote }}
    >
      {children}
    </CompanyNotesContext.Provider>
  );
}

export function useCompanyNotes() {
  const context = useContext(CompanyNotesContext);
  if (!context) {
    throw new Error("useCompanyNotes must be used within a CompanyNotesProvider");
  }
  return context;
}
