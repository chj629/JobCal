import Sidebar from "@/components/Sidebar";
import { CompaniesProvider } from "@/lib/companies-context";
import { ApplicationStepsProvider } from "@/lib/application-steps-context";
import { EventsProvider } from "@/lib/events-context";
import { CompanyNotesProvider } from "@/lib/company-notes-context";
import { CompanyContactsProvider } from "@/lib/company-contacts-context";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CompaniesProvider>
      <ApplicationStepsProvider>
        <EventsProvider>
          <CompanyNotesProvider>
            <CompanyContactsProvider>
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="min-w-0 flex-1">{children}</main>
              </div>
            </CompanyContactsProvider>
          </CompanyNotesProvider>
        </EventsProvider>
      </ApplicationStepsProvider>
    </CompaniesProvider>
  );
}
