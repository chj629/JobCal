// 로컬 타임존 기준 "YYYY-MM-DD" 키. new Date().toISOString()은 UTC로 변환되어
// UTC+9(한국/일본) 사용자의 자정 근처 "오늘" 계산이 하루 어긋날 수 있어 사용하지 않는다.
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// AI 메일 분석과 사용량 월 경계가 공유하는 Asia/Tokyo 기준 시각. 일본은 DST가 없으므로
// Intl로 현지 날짜·시각을 뽑고 명시적인 +09:00 offset을 붙인다. toISOString()의 UTC Z를
// 현지 시각이라고 잘못 설명하는 일이 없도록 서버에서 프롬프트에 넘길 때 사용한다.
export function formatDateTimeInAsiaTokyo(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+09:00`;
}

export function formatDateKeyInAsiaTokyo(date: Date): string {
  return formatDateTimeInAsiaTokyo(date).slice(0, 10);
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

// timestamptz(ISO 문자열)를 로컬 타임존 기준 "YYYY-MM-DD" 키로 변환한다.
export function dateKeyOf(iso: string): string {
  return formatDateKey(new Date(iso));
}

// timestamptz(ISO 문자열)를 로컬 타임존 기준 "HH:mm"으로 변환한다.
export function formatTimeOfDay(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// "YYYY-MM-DD" 날짜 키 두 개 사이의 일수 차이(to - from)를 계산한다.
export function diffInDays(fromKey: string, toKey: string): number {
  const from = new Date(`${fromKey}T00:00:00`);
  const to = new Date(`${toKey}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}
