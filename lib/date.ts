// 로컬 타임존 기준 "YYYY-MM-DD" 키. new Date().toISOString()은 UTC로 변환되어
// UTC+9(한국/일본) 사용자의 자정 근처 "오늘" 계산이 하루 어긋날 수 있어 사용하지 않는다.
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

// timestamptz(ISO 문자열)를 로컬 타임존 기준 "YYYY-MM-DD" 키로 변환한다.
export function dateKeyOf(iso: string): string {
  return formatDateKey(new Date(iso));
}
