"use client";

import { useState, type FormEvent } from "react";
import {
  OVERALL_STATUSES,
  PRIORITIES,
  type CompanyFormValues,
  type OverallStatus,
  type Priority,
} from "@/lib/companies";
import { useT } from "@/lib/locale-context";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

interface CompanyFormProps {
  title: string;
  initialValues: CompanyFormValues;
  onCancel: () => void;
  onSubmit: (values: CompanyFormValues) => void;
}

// docs/database.md의 overall_status 내부 값은 그대로 두고, 표시 라벨만
// companies.list.status.*를 재사용해 번역한다(기업 목록 화면과 동일한 상태 개념).
const STATUS_LABEL_KEYS: Record<OverallStatus, string> = {
  in_progress: "companies.list.status.inProgress",
  offer: "companies.list.status.offer",
  joined: "companies.list.status.joined",
  rejected: "companies.list.status.rejected",
  cancelled: "companies.list.status.cancelled",
};

export default function CompanyForm({
  title,
  initialValues,
  onCancel,
  onSubmit,
}: CompanyFormProps) {
  const t = useT();
  const [values, setValues] = useState<CompanyFormValues>(initialValues);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.name.trim()) {
      setError(t("companies.form.nameRequired"));
      return;
    }
    onSubmit(values);
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t("companies.form.name")}
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          error={error}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t("companies.form.status")}
            value={values.overallStatus}
            onChange={(e) =>
              setValues({ ...values, overallStatus: e.target.value as OverallStatus })
            }
          >
            {OVERALL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(STATUS_LABEL_KEYS[status])}
              </option>
            ))}
          </Select>
          <Select
            label={t("companies.form.priorityLabel")}
            value={values.priority}
            onChange={(e) => setValues({ ...values, priority: e.target.value as Priority })}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {t(`companies.list.priority.${priority}`)}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label={t("companies.form.websiteUrl")}
          type="text"
          value={values.websiteUrl}
          onChange={(e) => setValues({ ...values, websiteUrl: e.target.value })}
        />

        <Input
          label={t("companies.form.mypageUrl")}
          type="text"
          value={values.mypageUrl}
          onChange={(e) => setValues({ ...values, mypageUrl: e.target.value })}
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary">
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
