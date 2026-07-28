import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { Company } from "@/lib/companies";
import { getCurrentStep, type ApplicationStep } from "@/lib/applicationSteps";

interface RecentCompaniesProps {
  companies: Company[];
  steps: ApplicationStep[];
}

const RECENT_LIMIT = 5;
const NO_STEP_LABEL = "등록된 전형 없음";

export default function RecentCompanies({ companies, steps }: RecentCompaniesProps) {
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
          {recentCompanies.map((company) => {
            const companySteps = steps.filter((step) => step.companyId === company.id);
            const currentStepName = getCurrentStep(companySteps)?.name ?? NO_STEP_LABEL;

            return (
              <li key={company.id}>
                <Link
                  href={`/companies/${company.id}`}
                  className="flex items-center gap-3 px-6 py-3 transition-colors duration-150 hover:bg-background"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{company.name}</p>
                    <p className="mt-1 truncate text-xs text-secondary">
                      {currentStepName} · {company.updatedAt}
                    </p>
                  </div>
                  <StatusBadge status={company.overallStatus} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
