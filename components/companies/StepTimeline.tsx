"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { getCurrentStep, getStepDisplayName, type ApplicationStep } from "@/lib/applicationSteps";
import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface StepTimelineProps {
  companyId: string;
  selectedStepId: string | null;
  onSelect: (id: string | null) => void;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "Progress Stepper
// (Compact)" 카드. 전형 목록/현재 전형 계산(addStep 포함)은 기존 로직 그대로 재사용하고,
// 가로 타임라인 UI만 Stitch의 원형 스텝퍼로 바꿨다. 원을 클릭하면 선택되어 아래
// "選考詳細" 카드(SelectionDetail.tsx)에 그 전형의 상세가 표시된다.
export default function StepTimeline({ companyId, selectedStepId, onSelect }: StepTimelineProps) {
  const t = useT();
  const { steps, addStep, reorderSteps } = useApplicationSteps();
  const [isAdding, setIsAdding] = useState(false);
  const [newStepName, setNewStepName] = useState("");

  const companySteps = steps
    .filter((step) => step.companyId === companyId)
    .sort((a, b) => a.stepOrder - b.stepOrder);
  const currentStep = getCurrentStep(companySteps);

  // distance 임계값을 넘어야 드래그가 시작되므로, 움직임 없는 일반 클릭(전형 선택)은 그대로
  // onClick으로 처리된다 — 드래그와 클릭 선택이 충돌하지 않는다.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function handleAddStep(event: FormEvent) {
    event.preventDefault();
    if (!newStepName.trim()) {
      setIsAdding(false);
      return;
    }
    const created = await addStep(companyId, newStepName);
    setNewStepName("");
    setIsAdding(false);
    if (created) onSelect(created.id);
  }

  // arrayMove로 로컬 순서를 먼저 계산해 reorderSteps에 그대로 넘긴다. 실제 로컬 state
  // 반영(낙관적 업데이트)과 DB 저장, 실패 시 rollback은 reorderSteps(application-steps-context)
  // 가 전담한다 — 여기서는 순서 계산과 호출만 한다.
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = companySteps.map((step) => step.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    reorderSteps(companyId, arrayMove(ids, oldIndex, newIndex));
  }

  // 단계 이름 길이와 무관하게 원형 번호 중심 간격이 항상 균등하도록, flex 대신
  // 슬롯 폭이 모두 같은 grid로 배치한다(각 단계 + "追加" 슬롯 = companySteps.length + 1열).
  const slotCount = companySteps.length + 1;

  return (
    <div className="mb-8 rounded-stitch-xl border border-stitch-border bg-card px-4 py-5 shadow-sm">
      {/* 375/430px처럼 슬롯 수(전형 수+1)가 많아 minmax(0,1fr)만으로는 원이 서로
          맞닿고 라벨이 대부분 잘리는 문제가 있어, 슬롯 최소폭(64px)을 두고 이 래퍼에
          가로 스크롤을 허용한다. 데스크톱처럼 카드 폭이 충분하면 1fr이 여전히 남는
          공간을 균등 분배해 기존과 동일하게 꽉 채워진 균등 간격으로 보인다(스크롤 불필요).
          pt-1: overflow-x-auto가 있으면 overflow-y도 auto로 계산돼(스펙상 visible과
          섞어 쓸 수 없음) 현재 스텝 원의 ring이 위로 살짝 잘리던 것을, 원이 커진 뒤에도
          더 심해지지 않도록 여유를 둔다. */}
      <div className="overflow-x-auto stitch-scrollbar-hidden pt-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          // 가로 타임라인이라 순서 판단도 X축 기준이어야 한다. modifiers 없이는 포인터의
          // Y좌표를 그대로 따라가 아래로 크게 움직이면 dragged item이 타임라인 밖으로
          // 빠져나가는 것처럼 보였다 — Y를 항상 원래 위치로 고정해 좌우 이동만 허용한다.
          modifiers={[restrictToHorizontalAxis]}
        >
          <SortableContext
            items={companySteps.map((step) => step.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              // isolate: position:relative만으로는 새 stacking context가 생기지 않아(z-index가
              // auto라서), -z-10 자식이 이 grid의 형제(원 버튼)가 아니라 훨씬 상위 조상(카드
              // bg-card 등)보다도 뒤로 밀려나 아예 안 보이는 문제가 있었다. isolate로 이
              // grid 자체를 stacking context 경계로 만들어, -z-10 연결선이 정확히 "이 grid 안의
              // 형제 버튼들보다만" 뒤에 그려지게 한다.
              className="relative isolate grid w-full items-start"
              style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(64px, 1fr))` }}
            >
              {/* 원 중심(top-3.5, 28px 원의 정확히 절반)을 지나는 구간별 연결선. 슬롯이 전부
                  minmax(64px, 1fr)로 균등폭이라, 슬롯 i의 중심은 항상 (i+0.5)/slotCount이고
                  각 구간(다음 슬롯 중심까지)의 폭은 항상 1/slotCount — 그대로 %로 계산해
                  각 원 중심에 정확히 맞춘다. 원이 -z-10보다 위(기본 z)라 선은 원 뒤로 지나간다. */}
              <div className="absolute left-0 top-3.5 -z-10 h-[2px] w-full">
                {Array.from({ length: slotCount - 1 }).map((_, index) => {
                  const fromStep = companySteps[index];
                  const toStep = companySteps[index + 1];
                  let colorClass = "bg-stitch-border"; // waiting/failed 이후, 追加 버튼까지 기본값
                  if (fromStep?.stepStatus === "passed" && toStep?.stepStatus === "passed") {
                    colorClass = "bg-success";
                  } else if (fromStep?.stepStatus === "passed" && currentStep?.id === toStep?.id) {
                    colorClass = "bg-primary-navy";
                  }

                  const left = ((index + 0.5) / slotCount) * 100;
                  const width = (1 / slotCount) * 100;

                  return (
                    <div
                      key={index}
                      className={"absolute h-full " + colorClass}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  );
                })}
              </div>

              {companySteps.map((step) => {
                const isCurrent = currentStep?.id === step.id;
                const isSelected = selectedStepId ? step.id === selectedStepId : isCurrent;

                return (
                  <SortableStep
                    key={step.id}
                    step={step}
                    isCurrent={isCurrent}
                    isSelected={isSelected}
                    label={getStepDisplayName(step, t)}
                    onSelect={() => onSelect(step.id)}
                  />
                );
              })}

              <div className="flex min-w-0 flex-col items-center gap-1.5 px-1">
                {isAdding ? (
                  <form onSubmit={handleAddStep} className="w-full">
                    <input
                      type="text"
                      autoFocus
                      value={newStepName}
                      onChange={(e) => setNewStepName(e.target.value)}
                      onBlur={handleAddStep}
                      placeholder={t("companies.steps.newStepPlaceholder")}
                      className="w-full min-w-0 rounded-stitch-md border border-primary-navy bg-white px-2 py-1 text-[11px] text-stitch-ink outline-none"
                    />
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-stitch-border bg-card text-secondary transition-colors hover:border-primary-navy hover:text-primary-navy"
                  >
                    <MaterialIcon name="add" size={16} />
                  </button>
                )}
                <span className="w-full truncate text-center text-[12px] font-[400] text-secondary">
                  {t("companies.steps.addStep")}
                </span>
              </div>
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

interface SortableStepProps {
  step: ApplicationStep;
  isCurrent: boolean;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
}

// 원/라벨 마크업과 상태별 스타일(색상, 체크/X 아이콘)은 기존 그대로이고, 정렬 동작만
// useSortable로 교체했다. touch-none: PointerSensor가 터치에서도 정상 동작하려면
// 브라우저의 기본 터치 스크롤/제스처가 이 버튼 위에서 드래그와 경합하지 않아야 한다(dnd-kit
// 공식 권장 사항). transform/transition은 드래그 중 실시간으로 다른 단계를 밀어내는 것과
// drop 즉시 최종 위치에 자리 잡는 것 둘 다를 담당한다.
function SortableStep({ step, isCurrent, isSelected, label, onSelect }: SortableStepProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });
  const isCompleted = step.stepStatus === "passed";
  const isFailed = step.stepStatus === "failed";

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={
        // 연결선이 원 뒤로만 지나가고 원이 아닌 구간에서는 보이게 하려면 이 버튼
        // 자체는 배경을 칠하면 안 된다(전체 컬럼 폭을 차지해 선을 통째로 가리게
        // 됨) — 원 자체(span)는 상태별로 이미 자기 배경을 갖고 있어 그 부분만
        // 여전히 선을 가린다.
        "relative flex min-w-0 touch-none cursor-grab flex-col items-center gap-1.5 px-1 active:cursor-grabbing " +
        (isDragging ? "z-10 opacity-40" : "")
      }
    >
      <span
        className={
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-[400] shadow-sm " +
          (isCompleted
            ? "bg-success text-white"
            : isFailed
              ? "bg-error text-white"
              : isCurrent
                ? "bg-primary-navy text-white ring-2 ring-primary-navy/20"
                : "border border-stitch-border bg-card text-secondary") +
          (isSelected && !isCompleted && !isFailed && !isCurrent ? " ring-2 ring-primary-navy/40" : "")
        }
      >
        {isCompleted ? (
          <MaterialIcon name="check" size={16} filled />
        ) : isFailed ? (
          <MaterialIcon name="close" size={16} filled />
        ) : (
          step.stepOrder
        )}
      </span>
      <span
        className={
          "w-full truncate text-center text-[12px] font-[400] " +
          (isSelected || isCurrent ? "text-stitch-ink" : "text-secondary")
        }
      >
        {label}
      </span>
    </button>
  );
}
