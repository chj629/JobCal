import type { ReactNode } from "react";
import { CompaniesProvider } from "@/lib/companies-context";

export default function CompaniesLayout({ children }: { children: ReactNode }) {
  return <CompaniesProvider>{children}</CompaniesProvider>;
}
