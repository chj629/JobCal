"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastItemData {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// 42_feedback.png "1. Toasts" 기준. 자동으로 사라지는 시간만 최소 구현하고,
// 배경 고정(Banner), 진행률 표시 등은 이번 파일럿 범위가 아니라 넣지 않는다.
const AUTO_DISMISS_MS = 3000;

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLOR_CLASS: Record<ToastType, string> = {
  success: "border-success/40 text-success",
  error: "border-error/40 text-error",
  info: "border-info/40 text-info",
};

interface ToastItemProps {
  toast: ToastItemData;
  onRemove: (id: number) => void;
}

// 개별 toast의 등장/퇴장 애니메이션(components/ui/Modal.tsx 등과 동일한 mount/visible
// 패턴의 축소판)을 담당한다. 배열에서의 실제 제거(onRemove)는 fade-out이 끝난 뒤에만
// 일어나, 부모가 즉시 필터링해 DOM이 뚝 끊기던 문제를 없앤다. 3초 자동 종료는 이 컴포넌트가
// 마운트되는 시점(=toast가 생성되는 시점)부터 그대로 재는 동일한 타이머다.
function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const Icon = ICONS[toast.type];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  function requestDismiss() {
    setLeaving(true);
  }

  function handleTransitionEnd() {
    if (leaving) onRemove(toast.id);
  }

  // fade-in이 아직 재생되기 전(visible=false)에 dismiss가 요청되면 className이 이미
  // "opacity-0 -translate-y-1" 상태라 실제로 바뀌는 속성이 없어 transitionend가 발생하지
  // 않는다. onRemove가 영영 안 불려 toast가 화면에 남는 것을 막기 위한 안전장치.
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onRemove(toast.id), 200);
    return () => clearTimeout(timer);
  }, [leaving, onRemove, toast.id]);

  return (
    <div
      role="status"
      onTransitionEnd={handleTransitionEnd}
      className={
        "flex items-start gap-2 rounded-lg border bg-card p-3 text-sm shadow-lg transition-all duration-150 ease-out " +
        COLOR_CLASS[toast.type] +
        " " +
        (visible && !leaving ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1")
      }
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-foreground">{toast.message}</p>
      <button
        type="button"
        onClick={requestDismiss}
        className="shrink-0 text-secondary hover:text-foreground"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItemData[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed right-4 top-4 z-[60] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
