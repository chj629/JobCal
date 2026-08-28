// 로컬 타임존 기준 "YYYY-MM-DD" 키. new Date().toISOString()은 UTC로 변환되어
// UTC+9(한국/일본) 사용자의 자정 근처 "오늘" 계산이 하루 어긋날 수 있어 사용하지 않는다.
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const ASIA_TOKYO_TIME_ZONE = "Asia/Tokyo";

type DateTimeInput = Date | string;

interface AsiaTokyoDateTimeParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

const ASIA_TOKYO_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: ASIA_TOKYO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function asiaTokyoDateTimeParts(input: DateTimeInput): AsiaTokyoDateTimeParts {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Invalid date-time value");
  }

  const parts = ASIA_TOKYO_DATE_TIME_FORMATTER.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

// AI 메일 분석과 사용량 월 경계가 공유하는 Asia/Tokyo 기준 시각. 일본은 DST가 없으므로
// Intl로 현지 날짜·시각을 뽑고 명시적인 +09:00 offset을 붙인다. toISOString()의 UTC Z를
// 현지 시각이라고 잘못 설명하는 일이 없도록 서버에서 프롬프트에 넘길 때 사용한다.
export function formatDateTimeInAsiaTokyo(date: Date): string {
  const parts = asiaTokyoDateTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+09:00`;
}

// ISO instant/Date를 실행 환경과 무관하게 Tokyo 달력 날짜로 변환한다.
// Date 인자는 기존 AI 사용량/프롬프트 호출부와의 호환을 유지한다.
export function formatDateKeyInAsiaTokyo(input: DateTimeInput): string {
  const parts = asiaTokyoDateTimeParts(input);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// ISO instant를 Tokyo 벽시계 시각 "HH:mm"으로 변환한다.
export function formatTimeOfDayInAsiaTokyo(input: DateTimeInput): string {
  const parts = asiaTokyoDateTimeParts(input);
  return `${parts.hour}:${parts.minute}`;
}

// ISO instant를 <input type="datetime-local">에 넣을 Tokyo 벽시계 값으로 변환한다.
export function isoToDatetimeLocalInAsiaTokyo(iso: string): string {
  const parts = asiaTokyoDateTimeParts(iso);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// datetime-local은 timezone 정보가 없는 벽시계 값이다. 일본은 DST가 없으므로
// 명시적인 +09:00을 붙여 instant로 해석한 뒤 DB timestamptz에 저장 가능한 UTC ISO를 반환한다.
export function datetimeLocalInAsiaTokyoToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new RangeError("Invalid datetime-local value");
  }

  const instant = new Date(`${value}:00+09:00`);
  if (
    Number.isNaN(instant.getTime()) ||
    isoToDatetimeLocalInAsiaTokyo(instant.toISOString()) !== value
  ) {
    throw new RangeError("Invalid datetime-local value");
  }
  return instant.toISOString();
}

// 실행 환경의 local timezone이 아닌 Tokyo의 "오늘" 날짜를 반환한다.
// now 인자는 경계 시각을 고정한 테스트에서만 선택적으로 사용한다.
export function todayKeyInAsiaTokyo(now: Date = new Date()): string {
  return formatDateKeyInAsiaTokyo(now);
}

function dateKeyToUtcMilliseconds(dateKey: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new RangeError("Invalid date key");
  }
  const milliseconds = new Date(`${dateKey}T00:00:00Z`).getTime();
  if (
    Number.isNaN(milliseconds) ||
    new Date(milliseconds).toISOString().slice(0, 10) !== dateKey
  ) {
    throw new RangeError("Invalid date key");
  }
  return milliseconds;
}

// YYYY-MM-DD를 instant가 아닌 날짜-only 계산에 쓸 UTC 자정 Date로 매핑한다.
// 반환 Date에서는 반드시 getUTC* / UTC timeZone formatter만 사용해야 한다.
export function dateKeyToUtcDate(dateKey: string): Date {
  return new Date(dateKeyToUtcMilliseconds(dateKey));
}

export function dateKeyParts(dateKey: string): { year: number; month: number; day: number } {
  dateKeyToUtcMilliseconds(dateKey);
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfMonthDateKey(dateKey: string, monthOffset = 0): string {
  const { year, month } = dateKeyParts(dateKey);
  return new Date(Date.UTC(year, month - 1 + monthOffset, 1)).toISOString().slice(0, 10);
}

export function startOfWeekDateKey(dateKey: string): string {
  const date = dateKeyToUtcDate(dateKey);
  return addDaysToDateKey(dateKey, -date.getUTCDay());
}

export function dayOfWeekForDateKey(dateKey: string): number {
  return dateKeyToUtcDate(dateKey).getUTCDay();
}

// Tokyo 자정 직후 today key를 갱신하는 UI timer용 지연 시간.
export function millisecondsUntilNextDayInAsiaTokyo(now: Date = new Date()): number {
  const nextDateKey = addDaysToDateKey(todayKeyInAsiaTokyo(now), 1);
  const nextMidnight = datetimeLocalInAsiaTokyoToIso(`${nextDateKey}T00:00`);
  return Math.max(0, Date.parse(nextMidnight) - now.getTime());
}

// Tokyo에서 뽑은 YYYY-MM-DD 키끼리의 날짜 차이(to - from). 날짜-only 값을
// UTC 자정으로 매핑해 계산하므로 실행 환경 timezone과 DST 전환의 영향을 받지 않는다.
export function diffInDaysInAsiaTokyo(fromKey: string, toKey: string): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return (
    (dateKeyToUtcMilliseconds(toKey) - dateKeyToUtcMilliseconds(fromKey)) /
    millisecondsPerDay
  );
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
