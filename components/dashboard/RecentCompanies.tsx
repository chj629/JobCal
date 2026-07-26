import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { Company } from "@/lib/companies";

interface RecentCompaniesProps {
  companies: Company[];
}

const RECENT_LIMIT = 5;

export default function RecentCompanies({ companies }: RecentCompaniesProps) {
  const recentCompanies = [...companies]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, RECENT_LIMIT);

  return (
    <section className="rounded-[10px] border border-border bg-card">
      <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
        최근 지원 기업
      </h2>
      {recentCompanies.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-secondary">
          등록된 기업이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {recentCompanies.map((company) => (
            <li key={company.id}>
              <Link
                href={`/companies/${company.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-background"
              >
                <span className="flex-1 truncate text-sm font-medium text-foreground">
                  {company.name}
                </span>
                <span className="hidden text-sm text-secondary sm:inline">
                  {company.currentStep}
                </span>
                <StatusBadge status={company.status} />
                <span className="hidden w-24 text-right text-sm text-secondary sm:inline">
                  {company.updatedAt}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
