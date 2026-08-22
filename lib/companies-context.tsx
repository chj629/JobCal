"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHandleSupabaseError } from "@/lib/supabase/errorHandling";
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
  const handleSupabaseError = useHandleSupabaseError();
  const supabase = useMemo(() => createClient(), []);
  const [companies, setCompanies] = useState<Company[]>([]);
  // 화면 전체를 LoadingState로 가리는 것은 "아직 보여줄 데이터가 없는" 최초 진입/새로고침/
  // 실제 로그인·로그아웃·계정 전환에만 쓴다. 이미 companies가 있는 상태에서의 재조회는
  // loading을 건드리지 않는 backgroundRefresh로 처리해 기존 화면을 그대로 유지한다.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    // onAuthStateChange 콜백은 이 effect가 구독을 시작할 때 한 번만 만들어지는 클로저라,
    // state(userId)를 직접 읽으면 그 시점 값에 고정된다(stale closure). "직전에 알던
    // 사용자가 누구였는지"는 항상 최신값이 필요하므로 state 대신 ref로 따로 들고 있는다.
    let currentUserId: string | null = null;

    // companies 테이블만 다시 읽어와 로컬 state를 교체한다. loading/userId는 건드리지
    // 않는다 — 호출부(load 또는 backgroundRefresh)가 각자의 의미에 맞게 관리한다. 실패해도
    // companies는 그대로 두고(이미 보고 있던 화면이 사라지면 안 된다) error만 알린다.
    async function fetchCompanies() {
      const { data, error: fetchError } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: true });

      if (!isMounted) return;

      if (fetchError) {
        await handleSupabaseError(fetchError.message, setError);
        return;
      }

      setError(null);
      setCompanies(((data ?? []) as CompanyRow[]).map(rowToCompany));
    }

    // 최초 진입/새로고침, 그리고 실제 로그인·로그아웃·계정 전환 전용 — 기존과 동일하게
    // 화면 전체를 loading으로 가린다. auth.getUser()로 서버에 다시 검증받는다(세션 객체를
    // 그대로 믿지 않음 — Supabase 권장 방식, 기존 동작과 동일).
    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;
      currentUserId = user?.id ?? null;

      if (!user) {
        setUserId(null);
        setCompanies([]);
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await fetchCompanies();

      if (!isMounted) return;
      setLoading(false);
    }

    // 이미 화면에 companies가 있는 상태에서의 조용한 재조회. 탭 복귀 시 supabase-js가
    // 재발행하는 SIGNED_IN처럼 "같은 사용자의 세션 재확인"일 때 여기로 온다 — RLS가 어차피
    // auth.uid() 기준으로 결과를 좁혀주므로 getUser() 재검증 없이 바로 조회한다.
    async function backgroundRefresh() {
      await fetchCompanies();
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      // load()가 마운트 직후 이미 최초 조회를 하고 있으므로, 구독 시 항상 한 번 오는
      // INITIAL_SESSION은 중복 조회를 피하기 위해서만 건너뛴다(이벤트 종류로 "재조회가
      // 필요한지"를 판단하는 게 아니라 순수 중복 방지).
      if (event === "INITIAL_SESSION") return;

      // 이벤트 이름을 블랙리스트로 걸러내는 대신, 세션의 사용자 id가 직전에 알던 사용자와
      // 같은지로 판단한다. USER_UPDATED/TOKEN_REFRESHED/tab-focus SIGNED_IN처럼 이름은
      // 달라도 "같은 사용자"라면 전부 동일하게 background refresh로 처리되므로, 앞으로
      // Supabase가 새 이벤트를 추가해도(이벤트명 목록을 계속 늘릴 필요 없이) 그대로 안전하다.
      const nextUserId = session?.user?.id ?? null;

      if (nextUserId === currentUserId) {
        if (nextUserId) backgroundRefresh();
        return;
      }

      // 실제 로그인/로그아웃/다른 계정으로 전환된 경우 — 이전 사용자의 companies가 화면에
      // 잠깐이라도 남아있으면 안 되므로 즉시 비우고, load()로 새 사용자 기준 최초 로딩을
      // 다시 수행한다(loading=true로 화면 전체를 가리는 것은 이 경우엔 의도된 동작).
      setCompanies([]);
      load();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // handleSupabaseError는 locale이 바뀔 때마다 새 함수가 되는데(useHandleSupabaseError),
    // 이걸 deps에 넣으면 언어 설정 변경(user_metadata.language)마다 이 effect가 재구독돼
    // 불필요한 재조회가 생긴다 — 다른 context 파일들과 동일하게 의도적으로 제외한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
