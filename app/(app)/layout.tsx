import Sidebar from "@/components/Sidebar";
import { CompaniesProvider } from "@/lib/companies-context";
import { ApplicationStepsProvider } from "@/lib/application-steps-context";
import { EventsProvider } from "@/lib/events-context";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CompaniesProvider>
      <ApplicationStepsProvider>
        <EventsProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </EventsProvider>
      </ApplicationStepsProvider>
    </CompaniesProvider>
  );
}
