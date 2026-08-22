"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHandleSupabaseError } from "@/lib/supabase/errorHandling";
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
  const handleSupabaseError = useHandleSupabaseError();
  const supabase = useMemo(() => createClient(), []);
  const [notes, setNotes] = useState<CompanyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // onAuthStateChange 콜백이 "이 세션이 이전과 같은 사용자인지" 판단할 기준.
  // lib/companies-context.tsx와 동일한 이유(콜백 클로저에서 state를 직접 읽으면 구독 시점
  // 값에 고정되는 stale closure 문제)로 ref에 최신값을 따로 들고 있는다.
  const currentUserIdRef = useRef<string | null>(null);

  // company_notes만 다시 읽어와 로컬 state를 교체한다. loading/userId는 건드리지 않는다 —
  // 호출부(load 또는 backgroundRefresh)가 각자의 의미에 맞게 관리한다. 실패해도 기존
  // notes는 그대로 두고(이미 보고 있던 화면이 사라지면 안 된다) error만 알린다.
  async function fetchNotes() {
    const { data, error: fetchError } = await supabase
      .from("company_notes")
      .select("*")
      .order("position", { ascending: true });

    if (fetchError) {
      await handleSupabaseError(fetchError.message, setError);
      return;
    }

    setError(null);
    setNotes(((data ?? []) as CompanyNoteRow[]).map(rowToCompanyNote));
  }

  // 최초 진입/새로고침, 그리고 실제 로그인·로그아웃·계정 전환 전용 — 기존과 동일하게 화면
  // 전체를 loading으로 가린다.
  async function load() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    currentUserIdRef.current = user?.id ?? null;

    if (!user) {
      setUserId(null);
      setNotes([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);
    await fetchNotes();
    setLoading(false);
  }

  // 이미 화면에 notes가 있는 상태에서의 조용한 재조회. 탭 복귀 시 supabase-js가 재발행하는
  // SIGNED_IN처럼 "같은 사용자의 세션 재확인"일 때 여기로 온다 — RLS가 어차피 auth.uid()
  // 기준으로 결과를 좁혀주므로 getUser() 재검증 없이 바로 조회한다.
  async function backgroundRefresh() {
    await fetchNotes();
  }

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      await load();
    }

    initialLoad();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      // load()가 마운트 직후 이미 최초 조회를 하고 있으므로, 구독 시 항상 한 번 오는
      // INITIAL_SESSION은 중복 조회를 피하기 위해서만 건너뛴다.
      if (event === "INITIAL_SESSION") return;

      // 이벤트 이름을 블랙리스트로 걸러내는 대신, 세션의 사용자 id가 직전에 알던 사용자와
      // 같은지로 판단한다(lib/companies-context.tsx와 동일한 원칙).
      const nextUserId = session?.user?.id ?? null;

      if (nextUserId === currentUserIdRef.current) {
        if (nextUserId) backgroundRefresh();
        return;
      }

      // 실제 로그인/로그아웃/다른 계정으로 전환된 경우 — 이전 사용자의 notes가 화면에
      // 잠깐이라도 남아있으면 안 되므로 즉시 비우고 다시 불러온다.
      setNotes([]);
      load();
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
