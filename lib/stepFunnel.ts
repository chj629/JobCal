import { getCurrentStep, type ApplicationStep } from "@/lib/applicationSteps";
import type { Company } from "@/lib/companies";

export interface StepFunnelRow {
  name: string;
  stepKey: string | null;
  count: number;
  prevCount: number;
  passRate: number; // 0-100. 첫 행은 비교 대상이 없어 100으로 둔다.
}

// StepFunnelChart.tsx(선고 스텝별 기업 수)와 ResultSummaryCard.tsx(스텝별 통과율)가
// 같은 집계를 공유한다. 전형명은 기업마다 자유 입력이라 동일한 문자열끼리만 집계하고,
// 뜻이 비슷해 보여도 다른 이름끼리 임의로 묶지 않는다.
export function buildStepFunnelRows(companies: Company[], steps: ApplicationStep[]): StepFunnelRow[] {
  const stepsByCompany = new Map<string, ApplicationStep[]>();
  for (const step of steps) {
    const list = stepsByCompany.get(step.companyId) ?? [];
    list.push(step);
    stepsByCompany.set(step.companyId, list);
  }

  // 등장하는 전형명을 관측된 최소 step_order 기준으로 정렬한다(기업마다 순서가 다를 수 있어
  // 가장 앞서 관측된 순서를 그 이름의 대표 순서로 삼는다).
  const orderByName = new Map<string, number>();
  const stepKeyByName = new Map<string, string | null>();
  for (const step of steps) {
    const existing = orderByName.get(step.name);
    if (existing === undefined || step.stepOrder < existing) {
      orderByName.set(step.name, step.stepOrder);
    }
    if (!stepKeyByName.has(step.name)) {
      stepKeyByName.set(step.name, step.stepKey);
    }
  }

  const stepNames = Array.from(orderByName.keys()).sort(
    (a, b) => (orderByName.get(a) ?? 0) - (orderByName.get(b) ?? 0)
  );

  // 각 전형명에 대해 "그 전형을 완료했거나, 현재 전형이 그 전형과 같거나 더 뒤(step_order가
  // 크거나 같음)인 기업" 수를 센다.
  const counts = stepNames.map((name) => {
    let count = 0;
    for (const company of companies) {
      const companySteps = stepsByCompany.get(company.id) ?? [];
      const targetStep = companySteps.find((s) => s.name === name);
      if (!targetStep) continue;

      if (targetStep.stepStatus === "completed") {
        count += 1;
        continue;
      }

      const currentStep = getCurrentStep(companySteps);
      if (currentStep && targetStep.stepOrder <= currentStep.stepOrder) {
        count += 1;
      }
    }
    return { name, stepKey: stepKeyByName.get(name) ?? null, count };
  });

  return counts.map((row, index) => {
    const prevCount = index === 0 ? row.count : counts[index - 1].count;
    // 전형명이 자유 입력이라 회사마다 순서가 뒤섞이면 이후 단계 인원이 이전 단계보다
    // 많아질 수 있다(예: 같은 뜻의 다른 이름). 그런 경우에도 화면에는 0~100% 범위로만
    // 보여준다.
    const rawPassRate = index === 0 ? 100 : prevCount > 0 ? (row.count / prevCount) * 100 : 0;
    const passRate = Math.min(100, Math.round(rawPassRate * 10) / 10);
    return { ...row, prevCount, passRate };
  });
}
