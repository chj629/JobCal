"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCompanyContacts } from "@/lib/company-contacts-context";
import {
  createEmptyContactFormValues,
  contactToFormValues,
  type CompanyContact,
  type ContactFormValues,
} from "@/lib/companyContacts";
import ContactForm from "@/components/companies/ContactForm";
import { useT } from "@/lib/locale-context";

interface CompanyContactsProps {
  companyId: string;
}

export default function CompanyContacts({ companyId }: CompanyContactsProps) {
  const t = useT();
  const { contacts, error, addContact, updateContact, deleteContact } = useCompanyContacts();
  const [isExpanded, setIsExpanded] = useState(false);
  const [formState, setFormState] = useState<{ contact: CompanyContact | null } | null>(null);

  const companyContacts = contacts.filter((contact) => contact.companyId === companyId);

  async function handleDelete(contact: CompanyContact) {
    if (window.confirm(t("companies.contacts.deleteConfirm", { name: contact.name }))) {
      await deleteContact(contact.id);
    }
  }

  async function handleSubmit(values: ContactFormValues) {
    const ok = formState?.contact
      ? await updateContact(formState.contact.id, values)
      : await addContact(companyId, values);
    if (ok) setFormState(null);
  }

  return (
    <section className="rounded-[10px] border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-[16px] font-semibold text-foreground"
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          {t("companies.contacts.heading")}
          {companyContacts.length > 0 && (
            <span className="text-sm font-normal text-secondary">{companyContacts.length}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(true);
            setFormState({ contact: null });
          }}
          className="text-xs font-medium text-primary hover:underline"
        >
          {t("companies.contacts.addButton")}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4">
          {error && (
            <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </p>
          )}

          {companyContacts.length === 0 ? (
            <p className="py-6 text-center text-sm text-secondary">{t("companies.contacts.empty")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {companyContacts.map((contact) => (
                <div key={contact.id} className="rounded-[10px] border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{contact.name}</h3>
                      {contact.role && <p className="mt-0.5 text-xs text-secondary">{contact.role}</p>}
                    </div>
                    <div className="flex shrink-0 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setFormState({ contact })}
                        className="text-secondary hover:text-primary hover:underline"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(contact)}
                        className="text-secondary hover:text-error hover:underline"
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                  {(contact.email || contact.phone) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
                      {contact.email && <span>{contact.email}</span>}
                      {contact.phone && <span>{contact.phone}</span>}
                    </div>
                  )}
                  {contact.memo && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">{contact.memo}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
    </section>
  );
}
