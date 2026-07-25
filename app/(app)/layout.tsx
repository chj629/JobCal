import Sidebar from "@/components/Sidebar";
import { CompaniesProvider } from "@/lib/companies-context";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CompaniesProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </CompaniesProvider>
  );
}
