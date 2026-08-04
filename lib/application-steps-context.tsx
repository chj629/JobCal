"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  rowToApplicationStep,
  type ApplicationStep,
  type ApplicationStepRow,
  type StepStatus,
} from "@/lib/applicationSteps";

interface ApplicationStepsContextValue {
  steps: ApplicationStep[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<ApplicationStep[]>;
  addStep: (companyId: string, name: string) => Promise<ApplicationStep | null>;
  deleteStep: (id: string) => Promise<boolean>;
  renameStep: (id: string, name: string) => Promise<boolean>;
  updateStepStatus: (id: string, status: StepStatus) => Promise<boolean>;
  moveStep: (id: string, direction: "up" | "down") => Promise<boolean>;
}

const ApplicationStepsContext = createContext<ApplicationStepsContextValue | null>(null);

export function ApplicationStepsProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
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
      setSteps([]);
      setLoading(false);
      return [];
    }

    setUserId(user.id);

    const { data, error: fetchError } = await supabase
      .from("application_steps")
      .select("*")
      .order("step_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return [];
    }

    const mapped = ((data ?? []) as ApplicationStepRow[]).map(rowToApplicationStep);
    setSteps(mapped);
    setLoading(false);
    return mapped;
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

  async function addStep(companyId: string, name: string) {
    if (!userId) return null;

    const companySteps = steps.filter((step) => step.companyId === companyId);
    const nextOrder =
      companySteps.length === 0 ? 1 : Math.max(...companySteps.map((step) => step.stepOrder)) + 1;

    const { data, error: insertError } = await supabase
      .from("application_steps")
      .insert({
        user_id: userId,
        company_id: companyId,
        name: name.trim(),
        step_order: nextOrder,
        step_status: "waiting",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return null;
    }

    setError(null);
    const created = rowToApplicationStep(data as ApplicationStepRow);
    setSteps((prev) => [...prev, created]);
    return created;
  }

  async function deleteStep(id: string) {
    if (!userId) return false;

    const { error: deleteError } = await supabase.from("application_steps").delete().eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    setError(null);
    setSteps((prev) => prev.filter((step) => step.id !== id));
    return true;
  }

  async function renameStep(id: string, name: string) {
    if (!userId) return false;

    const { data, error: updateError } = await supabase
      .from("application_steps")
      .update({ name: name.trim() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    setError(null);
    const updated = rowToApplicationStep(data as ApplicationStepRow);
    setSteps((prev) => prev.map((step) => (step.id === id ? updated : step)));
    return true;
  }

  async function updateStepStatus(id: string, status: StepStatus) {
    if (!userId) return false;

    const { data, error: updateError } = await supabase
      .from("application_steps")
      .update({ step_status: status })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    setError(null);
    const updated = rowToApplicationStep(data as ApplicationStepRow);
    setSteps((prev) => prev.map((step) => (step.id === id ? updated : step)));
    return true;
  }

  async function moveStep(id: string, direction: "up" | "down") {
    if (!userId) return false;

    const step = steps.find((s) => s.id === id);
    if (!step) return false;

    const companySteps = steps
      .filter((s) => s.companyId === step.companyId)
      .sort((a, b) => a.stepOrder - b.stepOrder);
    const index = companySteps.findIndex((s) => s.id === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= companySteps.length) return false;

    const target = companySteps[swapIndex];

    const [{ error: errorA }, { error: errorB }] = await Promise.all([
      supabase.from("application_steps").update({ step_order: target.stepOrder }).eq("id", step.id),
      supabase.from("application_steps").update({ step_order: step.stepOrder }).eq("id", target.id),
    ]);

    if (errorA || errorB) {
      setError((errorA ?? errorB)!.message);
      return false;
    }

    setError(null);
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id === step.id) return { ...s, stepOrder: target.stepOrder };
        if (s.id === target.id) return { ...s, stepOrder: step.stepOrder };
        return s;
      })
    );
    return true;
  }

  return (
    <ApplicationStepsContext.Provider
      value={{
        steps,
        loading,
        error,
        refresh: load,
        addStep,
        deleteStep,
        renameStep,
        updateStepStatus,
        moveStep,
      }}
    >
      {children}
    </ApplicationStepsContext.Provider>
  );
}

export function useApplicationSteps() {
  const context = useContext(ApplicationStepsContext);
  if (!context) {
    throw new Error("useApplicationSteps must be used within an ApplicationStepsProvider");
  }
  return context;
}
