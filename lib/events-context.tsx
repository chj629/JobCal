"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
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
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<AppEvent[]>([]);
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
      setEvents([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error: fetchError } = await supabase.from("events").select("*");

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setEvents(((data ?? []) as EventRow[]).map(rowToEvent));
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
      setError(insertError.message);
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
      setError(updateError.message);
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
      setError(deleteError.message);
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
