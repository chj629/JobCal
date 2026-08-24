"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useHandleSupabaseError } from "@/lib/supabase/errorHandling";
import {
  rowToEvent,
  eventFormValuesToRow,
  type AppEvent,
  type EventFormValues,
  type EventRow,
} from "@/lib/events";

interface EventsContextValue {
  events: AppEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addEvent: (
    companyId: string,
    applicationStepId: string,
    values: EventFormValues
  ) => Promise<boolean>;
  updateEvent: (id: string, values: EventFormValues) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const handleSupabaseError = useHandleSupabaseError();
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // onAuthStateChange 콜백이 "이 세션이 이전과 같은 사용자인지" 판단할 기준.
  // lib/companies-context.tsx와 동일한 이유(콜백 클로저에서 state를 직접 읽으면 구독 시점
  // 값에 고정되는 stale closure 문제)로 ref에 최신값을 따로 들고 있는다.
  const currentUserIdRef = useRef<string | null>(null);

  // events만 다시 읽어와 로컬 state를 교체한다. loading/userId는 건드리지 않는다 — 호출부
  // (load 또는 backgroundRefresh)가 각자의 의미에 맞게 관리한다. 실패해도 기존 events는
  // 그대로 두고(이미 보고 있던 화면이 사라지면 안 된다) error만 알린다.
  async function fetchEvents() {
    const { data, error: fetchError } = await supabase.from("events").select("*");

    if (fetchError) {
      await handleSupabaseError(fetchError.message, setError);
      return;
    }

    setError(null);
    setEvents(((data ?? []) as EventRow[]).map(rowToEvent));
  }

  // 최초 진입/새로고침, 그리고 실제 로그인·로그아웃·계정 전환 전용 — 기존과 동일하게 화면
  // 전체를 loading으로 가린다.
  async function load() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser();

    // getUser()는 "진짜 로그아웃/세션 무효"와 "Supabase Auth API에 순간적으로 접근하지
    // 못한 것뿐인 retryable 오류"를 둘 다 user: null로 반환한다(lib/supabase/proxy.ts와
    // 동일한 이유) — retryable이면 실제로 로그아웃된 게 아니므로 currentUserIdRef/
    // userId/events를 전혀 건드리지 않고 loading만 정리한다. 화면에 이미 있던 정상
    // 데이터를 일시적 오류로 비우지 않기 위함이며, 인증 성공으로 간주하는 것도
    // 아니다 — 다음 정상 호출에서 다시 검증된다.
    if (!user && getUserError && isAuthRetryableFetchError(getUserError)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[auth] getUser() 확인이 일시적으로 실패해(retryable) 기존 events를 유지합니다.",
          { errorName: getUserError.name }
        );
      }
      setLoading(false);
      return;
    }

    currentUserIdRef.current = user?.id ?? null;

    if (!user) {
      setUserId(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);
    await fetchEvents();
    setLoading(false);
  }

  // 이미 화면에 events가 있는 상태에서의 조용한 재조회. 탭 복귀 시 supabase-js가 재발행하는
  // SIGNED_IN처럼 "같은 사용자의 세션 재확인"일 때 여기로 온다 — RLS가 어차피 auth.uid()
  // 기준으로 결과를 좁혀주므로 getUser() 재검증 없이 바로 조회한다.
  async function backgroundRefresh() {
    await fetchEvents();
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

      // 실제 로그인/로그아웃/다른 계정으로 전환된 경우 — 이전 사용자의 events가 화면에
      // 잠깐이라도 남아있으면 안 되므로 즉시 비우고 다시 불러온다.
      setEvents([]);
      load();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function addEvent(companyId: string, applicationStepId: string, values: EventFormValues) {
    if (!userId) return false;

    const { data, error: insertError } = await supabase
      .from("events")
      .insert({
        user_id: userId,
        company_id: companyId,
        application_step_id: applicationStepId,
        ...eventFormValuesToRow(values),
      })
      .select()
      .single();

    if (insertError) {
      await handleSupabaseError(insertError.message, setError);
      return false;
    }

    setError(null);
    setEvents((prev) => [...prev, rowToEvent(data as EventRow)]);
    return true;
  }

  async function updateEvent(id: string, values: EventFormValues) {
    if (!userId) return false;

    const { data, error: updateError } = await supabase
      .from("events")
      .update(eventFormValuesToRow(values))
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      await handleSupabaseError(updateError.message, setError);
      return false;
    }

    setError(null);
    const updated = rowToEvent(data as EventRow);
    setEvents((prev) => prev.map((event) => (event.id === id ? updated : event)));
    return true;
  }

  async function deleteEvent(id: string) {
    if (!userId) return false;

    const { error: deleteError } = await supabase.from("events").delete().eq("id", id);

    if (deleteError) {
      await handleSupabaseError(deleteError.message, setError);
      return false;
    }

    setError(null);
    setEvents((prev) => prev.filter((event) => event.id !== id));
    return true;
  }

  return (
    <EventsContext.Provider
      value={{ events, loading, error, refresh: load, addEvent, updateEvent, deleteEvent }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
}
