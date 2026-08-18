// app/api/ai/analyze-email/route.ts는 로그인 사용자라 Supabase(ai_analysis_usage 테이블)로
// auth.uid() 기준 사용량을 집계한다. /contact는 비로그인 사용자도 쓰므로 같은 방식을 쓸 수
// 없어, 요청 IP 기준의 메모리 내 슬라이딩 윈도우로 "기본적인" 스팸 방지만 둔다. 서버리스
// 인스턴스가 재시작/여러 개로 분산되면 카운트가 리셋·분산되어 완벽한 차단은 아니지만,
// 같은 인스턴스에서의 짧은 시간 내 반복 제출은 막는다 — 새 DB 테이블/마이그레이션 없이
// MVP 범위에 맞는 최소 구현.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

const requestLog = new Map<string, number[]>();

export function checkContactRateLimit(key: string): boolean {
  const now = Date.now();
  const recentTimestamps = (requestLog.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(key, recentTimestamps);
    return false;
  }

  recentTimestamps.push(now);
  requestLog.set(key, recentTimestamps);
  return true;
}
