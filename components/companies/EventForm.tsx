"use client";

import { useState, type FormEvent } from "react";
import { EVENT_TYPES, EVENT_TYPE_LABELS, type EventFormValues, type EventType } from "@/lib/events";

interface EventFormProps {
  title: string;
  initialValues: EventFormValues;
  onCancel: () => void;
  onSubmit: (values: EventFormValues) => void;
}

const fieldClass =
  "h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none";
const labelClass = "mb-1 block text-sm text-secondary";

export default function EventForm({ title, initialValues, onCancel, onSubmit }: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>(initialValues);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    onSubmit(values);
  }

  const isSchedule = values.eventType === "schedule";
  const isDeadlineOrResult =
    values.eventType === "deadline" || values.eventType === "result_announcement";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[10px] border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-[16px] font-semibold text-foreground">{title}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>종류</label>
            <select
              value={values.eventType}
              onChange={(e) => setValues({ ...values, eventType: e.target.value as EventType })}
              className={fieldClass}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>제목</label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              className={fieldClass}
            />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
          </div>

          {isSchedule && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>시작 일시</label>
                  <input
                    type="datetime-local"
                    value={values.startsAt}
                    onChange={(e) => setValues({ ...values, startsAt: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    종료 일시 <span className="text-secondary">(선택)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={values.endsAt}
                    onChange={(e) => setValues({ ...values, endsAt: e.target.value })}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  장소 <span className="text-secondary">(선택)</span>
                </label>
                <input
                  type="text"
                  value={values.location}
                  onChange={(e) => setValues({ ...values, location: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  온라인 참가 링크 <span className="text-secondary">(선택)</span>
                </label>
                <input
                  type="text"
                  value={values.onlineUrl}
                  onChange={(e) => setValues({ ...values, onlineUrl: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </>
          )}

          {isDeadlineOrResult && (
            <>
              <div>
                <label className={labelClass}>
                  {values.eventType === "deadline" ? "마감 일시" : "결과 발표 예정 일시"}
                </label>
                <input
                  type="datetime-local"
                  value={values.dueAt}
                  onChange={(e) => setValues({ ...values, dueAt: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {values.eventType === "deadline" ? "제출 링크" : "결과 확인 링크"}{" "}
                  <span className="text-secondary">(선택)</span>
                </label>
                <input
                  type="text"
                  value={values.onlineUrl}
                  onChange={(e) => setValues({ ...values, onlineUrl: e.target.value })}
                  className={fieldClass}
                />
              </div>
            </>
          )}

          <div>
            <label className={labelClass}>
              메모 <span className="text-secondary">(선택)</span>
            </label>
            <textarea
              value={values.memo}
              onChange={(e) => setValues({ ...values, memo: e.target.value })}
              rows={2}
              className="w-full rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-[10px] border border-border px-4 text-sm font-medium text-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              className="h-10 rounded-[10px] bg-primary px-4 text-sm font-medium text-white"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
