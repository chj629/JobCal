"use client";

import { useParams } from "next/navigation";
import CompanyDetailScreen from "@/components/companies/CompanyDetailScreen";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();

  return <CompanyDetailScreen companyId={id} />;
}
