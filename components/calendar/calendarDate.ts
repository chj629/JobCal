import { isoToDatetimeLocalInAsiaTokyo } from "@/lib/date";
import type { AppEvent } from "@/lib/events";

export const CALENDAR_HOUR_ROW_HEIGHT = 56;
const MIN_DURATION_MINUTES = 40;

export function tokyoWallClock(iso: string) {
  const local = isoToDatetimeLocalInAsiaTokyo(iso);
  const [dateKey, time] = local.split("T");
  const [hour, minute] = time.split(":").map(Number);
  return { dateKey, hour, minute, minutes: hour * 60 + minute };
}

export function getCalendarWeekEventPosition(
  event: AppEvent,
  startHour: number,
  visibleHourCount: number
) {
  const at = event.startsAt ?? event.dueAt;
  if (!at) return null;
  const start = tokyoWallClock(at);
  const minutesFromGridStart = start.minutes - startHour * 60;
  const top = (minutesFromGridStart / 60) * CALENDAR_HOUR_ROW_HEIGHT;
  let durationMinutes = MIN_DURATION_MINUTES;
  if (event.endsAt) {
    // duration은 instant 차이로 계산하되, 주간 그리드에서는 Tokyo 시작일의
    // 자정까지로 제한해 여러 날에 걸친 잘못된 입력이 칸 밖으로 넘치지 않게 한다.
    const actualDurationMinutes =
      (new Date(event.endsAt).getTime() - new Date(at).getTime()) / 60000;
    const minutesUntilTokyoMidnight = 24 * 60 - start.minutes;
    durationMinutes = Math.max(
      MIN_DURATION_MINUTES,
      Math.min(actualDurationMinutes, minutesUntilTokyoMidnight)
    );
  }
  const rawHeight = (durationMinutes / 60) * CALENDAR_HOUR_ROW_HEIGHT;
  const maxHeight = Math.max(
    CALENDAR_HOUR_ROW_HEIGHT / 2,
    visibleHourCount * CALENDAR_HOUR_ROW_HEIGHT - top
  );
  return { top, height: Math.min(rawHeight, maxHeight) };
}
