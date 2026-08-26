"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserPlan, type Plan } from "@/lib/paddle/getUserPlan";
import { getAiAnalysisUsage, type AiAnalysisUsage } from "@/lib/ai/analysisUsage";

const AI_ANALYSIS_USAGE_CHANGED_EVENT = "jobcal:ai-analysis-usage-changed";

// 분석 API가 성공하고 RPC 소비까지 끝난 직후 호출한다. 같은 화면에 Drawer와 Settings가
// 함께 마운트돼 있어도 둘 다 이 이벤트를 받아 각자의 표시 숫자만 조용히 다시 조회한다.
export function notifyAiAnalysisUsageChanged() {
  window.dispatchEvent(new Event(AI_ANALYSIS_USAGE_CHANGED_EVENT));
}

export function useAiAnalysisUsage(enabled: boolean, knownPlan?: Plan) {
  const [usage, setUsage] = useState<AiAnalysisUsage | null>(null);
  const [loading, setLoading] = useState(enabled);
  const requestGenerationRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!enabled) return null;
    const generation = ++requestGenerationRef.current;
    setLoading(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      if (requestGenerationRef.current === generation) {
        setUsage(null);
        setLoading(false);
      }
      return null;
    }

    const plan = knownPlan ?? (await getUserPlan(supabase));
    const result = await getAiAnalysisUsage(supabase, plan);
    if (requestGenerationRef.current === generation) {
      setUsage(result);
      setLoading(false);
    }
    return result;
  }, [enabled, knownPlan]);

  useEffect(() => {
    if (!enabled) {
      requestGenerationRef.current += 1;
      queueMicrotask(() => {
        setUsage(null);
        setLoading(false);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refetch();
    });
    return () => {
      cancelled = true;
      requestGenerationRef.current += 1;
    };
  }, [enabled, refetch]);

  useEffect(() => {
    if (!enabled) return;
    const handleChanged = () => void refetch();
    window.addEventListener(AI_ANALYSIS_USAGE_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(AI_ANALYSIS_USAGE_CHANGED_EVENT, handleChanged);
  }, [enabled, refetch]);

  return { usage, loading, refetch };
}
