"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useT } from "@/lib/locale-context";

interface StepReconcileDialogProps {
  companyName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// useStepReconcileCheck과 함께 쓰는 확인 모달. 예전에는 미완료 전형을 하나씩 다시 골라야
// 하는 무거운 UI였지만, stepStatus에 passed/failed가 명확히 분리된 지금은 "아직 결과가
// 정해지지 않은 전형이 있다"는 사실만 알리고 그대로 진행할지만 물으면 충분하다. 전형 상태는
// 여기서 바꾸지 않고, 필요하면 나중에 StepDetailPanel에서 개별적으로 바꾼다.
export default function StepReconcileDialog({
  companyName,
  onCancel,
  onConfirm,
}: StepReconcileDialogProps) {
  const t = useT();

  return (
    <ConfirmDialog
      open
      title={t("companies.stepReconcile.title")}
      description={t("companies.stepReconcile.description", { name: companyName })}
      confirmLabel={t("companies.stepReconcile.confirm")}
      cancelLabel={t("companies.stepReconcile.cancel")}
      variant="primary"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
