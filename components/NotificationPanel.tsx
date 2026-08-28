"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/locale-context";
import { formatTimeOfDayInAsiaTokyo } from "@/lib/date";
import {
  NOTIFICATION_TIME_KEYS,
  NOTIFICATION_TITLE_KEYS,
  type AppNotification,
} from "@/lib/notifications";
import EmptyState from "@/components/ui/EmptyState";

export interface NotificationPanelProps {
  open: boolean;
  // Header의 벨 버튼 ref. AiOnboardingStep3.tsx와 동일하게 이 ref의 실제 위치를 기준으로
  // 패널을 배치한다(Header 자체의 relative/absolute 대신 fixed + getBoundingClientRect를
  // 쓰는 이유: 좁은 화면에서도 뷰포트 밖으로 나가지 않게 clamp하기 위함).
  anchorRef: RefObject<HTMLButtonElement | null>;
  notifications: AppNotification[];
  readKeys: Set<string>;
  onSelect: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}

const PANEL_WIDTH = 320; // w-80
const VIEWPORT_MARGIN = 12;
const ANCHOR_GAP = 8;

// 요청한 벨 버튼 클릭 → 드롭다운 패널. components/Header.tsx의 계정 메뉴 드롭다운과 같은
// 시각 언어(rounded-lg, border-stitch-border, bg-card, shadow-lg)를 그대로 재사용한다.
// Header의 relative wrapper에 얹는 대신 document.body로 portal하는 이유는, 알림 패널이
// 계정 메뉴보다 넓어(w-80) Header 우측 클러스터 안에서 absolute right-0로만 두면 좁은
// 화면에서 뷰포트 밖으로 밀려날 수 있기 때문 — AiOnboardingStep3.tsx와 동일하게 anchor의
// 실제 getBoundingClientRect를 기준으로 매번 clamp된 위치를 계산한다.
//
// "바깥 클릭 시 닫기"는 풀스크린 투명 backdrop div가 아니라 document의 mousedown을
// 구독하는 방식으로 구현한다(3단계에서 변경) — backdrop div 방식은 이 패널이 열려 있는
// 동안 화면 전체를 z-40으로 덮어, 계정 메뉴 버튼처럼 그 아래(z-index가 낮은) 다른 트리거를
// 클릭해도 첫 클릭이 backdrop에 막혀 onClose만 실행되고 그 트리거 자신의 onClick은 같은
// 클릭에서 실행되지 않는 문제가 있었다(패널 전환에 클릭 두 번 필요). mousedown 시점에
// panelRef/anchorRef 바깥인지만 판정하고 실제로 아무 것도 가로막지 않으므로, 클릭은 항상
// 실제 대상 엘리먼트(예: 계정 메뉴 버튼)까지 그대로 도달해 그 엘리먼트의 onClick도 같은
// 클릭 안에서 정상 실행된다 — mousedown이 click보다 먼저 발생하므로 "이 패널을 닫는 것"과
// "다른 트리거를 여는 것"이 한 번의 클릭 안에서 순서대로 모두 일어난다.
export default function NotificationPanel({
  open,
  anchorRef,
  notifications,
  readKeys,
  onSelect,
  onMarkAllRead,
  onClose,
}: NotificationPanelProps) {
  const t = useT();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      // 패널 내부 클릭(알림 항목/전체읽음 버튼 등)은 각자의 onClick이 처리하므로 여기서는
      // 무시한다. anchor(벨 버튼) 자체 클릭도 무시한다 — Header의 토글 onClick이 같은
      // 클릭에서 이미 열림/닫힘을 처리하므로, 여기서 먼저 닫아버리면 그 토글과 충돌한다.
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, anchorRef, onClose]);

  useEffect(() => {
    if (!open) return;

    function measure() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // 기본은 벨 버튼의 오른쪽 끝에 패널 오른쪽 끝을 맞춘다(계정 메뉴의 right-0와 같은
      // 정렬). 그 결과가 뷰포트 밖으로 나가면 좌우 여백(VIEWPORT_MARGIN) 안쪽으로 clamp한다.
      // 바깥쪽 Math.max를 마지막에 적용해 왼쪽 여백을 항상 우선한다 — 뷰포트가
      // PANEL_WIDTH + 여백 두 배보다 좁아 두 clamp 경계가 역전되는 극단적으로 좁은 화면
      // (예: 320px)에서도 left가 음수(왼쪽으로 화면 밖 이탈)가 되는 대신 최소한 왼쪽
      // 여백은 지켜지고, 남는 초과분은 style의 maxWidth(아래)가 패널 폭 자체를 줄여 흡수한다.
      const left = Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN)
      );
      setPosition({ top: rect.bottom + ANCHOR_GAP, left });
    }

    measure();
    window.addEventListener("resize", measure);
    document.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      document.removeEventListener("scroll", measure, true);
    };
  }, [open, anchorRef]);

  if (!open || !position) return null;

  const unreadKeys = notifications.filter((n) => !readKeys.has(n.key)).map((n) => n.key);

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t("notifications.title")}
      className="fixed z-40 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-lg border border-stitch-border bg-card shadow-lg"
      style={{ top: position.top, left: position.left, maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)` }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-stitch-border px-3 py-2.5">
        <span className="text-sm font-semibold text-stitch-ink">{t("notifications.title")}</span>
        {unreadKeys.length > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs text-secondary transition-colors hover:text-stitch-ink"
          >
            {t("notifications.markAllRead")}
          </button>
        )}
      </div>

      <div className="min-h-0 overflow-y-auto">
        {notifications.length === 0 && (
          <EmptyState icon="notifications" title={t("notifications.empty")} />
        )}

        {notifications.map((notification) => {
          const isRead = readKeys.has(notification.key);
          // billing(Paddle past_due)은 기업/일정과 무관한 고정 문구 2줄(제목+설명)만
          // 있고, deadline/schedule처럼 "실제 날짜/시간"에 해당하는 3번째 줄이 없다.
          const isBilling = notification.kind === "billing";
          const titleText = isBilling
            ? t(notification.titleKey)
            : t(NOTIFICATION_TITLE_KEYS[notification.kind][notification.bucket], {
                title: notification.title,
              });
          const secondaryText = isBilling ? t(notification.descriptionKey) : notification.companyName;

          return (
            <button
              key={notification.key}
              type="button"
              onClick={() => onSelect(notification)}
              className="flex w-full flex-col items-start gap-0.5 border-b border-stitch-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-black/[0.02]"
            >
              <span className="flex items-center gap-1.5">
                {!isRead && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-navy"
                  />
                )}
                <span
                  className={
                    "text-[13px] " + (isRead ? "font-normal text-secondary" : "font-[500] text-stitch-ink")
                  }
                >
                  {titleText}
                </span>
              </span>
              <span className={"text-[12px] " + (isRead ? "text-secondary/70" : "text-secondary")}>
                {secondaryText}
              </span>
              {!isBilling && (
                <span className={"text-[12px] " + (isRead ? "text-secondary/70" : "text-secondary")}>
                  {t(NOTIFICATION_TIME_KEYS[notification.bucket], {
                    time: formatTimeOfDayInAsiaTokyo(notification.at),
                  })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
