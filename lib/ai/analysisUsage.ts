import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDateKeyInAsiaTokyo } from "@/lib/date";
import type { Plan } from "@/lib/paddle/getUserPlan";

export const FREE_AI_ANALYSIS_LIMIT = 10;
export const PRO_AI_ANALYSIS_LIMIT = 300;
export const PRO_AI_ANALYSIS_WARNING_THRESHOLD = 270;

export interface AiAnalysisUsage {
  plan: Plan;
  used: number;
  limit: number;
}

// userId를 받지 않고 현재 세션의 Supabase client만 사용한다. ai_analysis_usage의
// select-own RLS(auth.uid() = user_id)가 조회 대상을 현재 사용자로 고정하며, Free는
// 가입 후 전체 합계, Pro는 분석 API와 동일한 Asia/Tokyo 월 시작일 이후 합계를 센다.
export async function getAiAnalysisUsage(
  supabase: SupabaseClient,
  plan: Plan,
  now = new Date()
): Promise<AiAnalysisUsage | null> {
  const query = supabase.from("ai_analysis_usage").select("call_count");
  const { data, error } =
    plan === "pro"
      ? await query.gte("usage_date", `${formatDateKeyInAsiaTokyo(now).slice(0, 7)}-01`)
      : await query;

  if (error) {
    console.error("[ai-analysis-usage] 사용량 조회 실패:", error.message);
    return null;
  }

  return {
    plan,
    used: (data ?? []).reduce((sum, row) => sum + row.call_count, 0),
    limit: plan === "pro" ? PRO_AI_ANALYSIS_LIMIT : FREE_AI_ANALYSIS_LIMIT,
  };
}
