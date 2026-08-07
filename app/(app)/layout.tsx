"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AiMailDrawer from "@/components/ai/AiMailDrawer";
import { CompaniesProvider } from "@/lib/companies-context";
import { ApplicationStepsProvider } from "@/lib/application-steps-context";
import { EventsProvider } from "@/lib/events-context";
import { CompanyNotesProvider } from "@/lib/company-notes-context";
import { CompanyContactsProvider } from "@/lib/company-contacts-context";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  return (
    <CompaniesProvider>
      <ApplicationStepsProvider>
        <EventsProvider>
          <CompanyNotesProvider>
            <CompanyContactsProvider>
              <ToastProvider>
                <div className="flex min-h-screen">
                  <Sidebar />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Header onOpenAiDrawer={() => setAiDrawerOpen(true)} />
                    <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
                  </div>
                </div>
                <AiMailDrawer open={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
              </ToastProvider>
            </CompanyContactsProvider>
          </CompanyNotesProvider>
        </EventsProvider>
      </ApplicationStepsProvider>
    </CompaniesProvider>
  );
}
