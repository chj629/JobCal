"use client";

import { useState } from "react";
import { useCompanyContacts } from "@/lib/company-contacts-context";
import {
  createEmptyContactFormValues,
  contactToFormValues,
  type CompanyContact,
  type ContactFormValues,
} from "@/lib/companyContacts";
import ContactForm from "@/components/companies/ContactForm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useT } from "@/lib/locale-context";

interface CompanyContactsProps {
  companyId: string;
}

function getInitials(name: string) {
  return name.trim().slice(0, 1);
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "担当者" 카드.
// 추가/수정/삭제 로직은 기존 그대로 재사용하고, 목록 UI만 Stitch의 아바타+이름/직함 한 줄
// 스타일로 바꿨다(펼치기/접기는 Stitch에 없어서 뺐고, 항상 펼쳐서 보여준다).
export default function CompanyContacts({ companyId }: CompanyContactsProps) {
  const t = useT();
  const { contacts, error, addContact, updateContact, deleteContact } = useCompanyContacts();
  const [formState, setFormState] = useState<{ contact: CompanyContact | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyContact | null>(null);

  const companyContacts = contacts.filter((contact) => contact.companyId === companyId);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteContact(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function handleSubmit(values: ContactFormValues) {
    const ok = formState?.contact
      ? await updateContact(formState.contact.id, values)
      : await addContact(companyId, values);
    if (ok) setFormState(null);
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="flex items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
            <MaterialIcon name="person" size={17} className="text-secondary" />
            {t("companies.contacts.heading")}
          </h3>
          {companyContacts.length > 0 && (
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary-navy text-[11px] font-[400] text-white">
              {companyContacts.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFormState({ contact: null })}
          className="flex items-center gap-0.5 rounded-stitch-md px-2 py-1 text-[11px] font-[400] text-primary-navy transition-colors hover:bg-black/[0.02]"
        >
          <MaterialIcon name="add" size={14} />
          {t("companies.contacts.addButton")}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="pl-6">
        {companyContacts.length === 0 ? (
          <EmptyState icon="person" title={t("companies.contacts.empty")} />
        ) : (
          <div className="space-y-3">
            {companyContacts.map((contact) => (
              <div
                key={contact.id}
                className="group -mx-2 flex items-center justify-between rounded-stitch-xl border border-transparent bg-[#f8f9ff] p-3 transition-colors hover:border-stitch-border"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-navy/10 text-[12px] font-[400] text-primary-navy">
                    {getInitials(contact.name)}
                  </span>
                  <div>
                    <p className="text-[13px] font-[400] leading-tight text-stitch-ink">
                      {contact.name}
                    </p>
                    {(contact.role || contact.email || contact.phone) && (
                      <p className="mt-0.5 text-[12px] text-secondary">
                        {[contact.role, contact.email, contact.phone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setFormState({ contact })}
                    className="rounded-stitch-md border border-stitch-border bg-white p-1.5 text-secondary shadow-sm hover:bg-[#f8f9ff]"
                    aria-label={t("common.edit")}
                  >
                    <MaterialIcon name="edit" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(contact)}
                    className="rounded-stitch-md border border-stitch-border bg-white p-1.5 text-secondary shadow-sm hover:bg-[#f8f9ff] hover:text-error"
                    aria-label={t("common.delete")}
                  >
                    <MaterialIcon name="delete" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formState && (
        <ContactForm
          title={
            formState.contact
              ? t("companies.contacts.editModalTitle")
              : t("companies.contacts.addModalTitle")
          }
          initialValues={
            formState.contact ? contactToFormValues(formState.contact) : createEmptyContactFormValues()
          }
          onCancel={() => setFormState(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("companies.contacts.deleteConfirm", { name: deleteTarget?.name ?? "" })}
        description={t("common.cannotUndo")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
