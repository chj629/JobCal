import type { ApplicationStep } from "@/lib/applicationSteps";
import type { Company } from "@/lib/companies";

export interface StepFunnelRow {
  name: string;
  stepKey: string | null;
  // 이 전형에 도달한 기업 수(waiting 제외, in_progress/passed/failed 포함). StepFunnelChart의
  // "選考ステップ" 막대 길이로 쓴다.
  count: number;
  // 이 전형에서 실제로 통과/불합격까지 결정된 수. ResultSummaryCard의 "選考結果"가 쓴다.
  passedCount: number;
  failedCount: number;
  // passedCount / (passedCount + failedCount) * 100. 아직 결정되지 않은 경우(둘 다 0) 0.
  passRate: number;
}

// StepFunnelChart.tsx(전형별 도달 기업 수)와 ResultSummaryCard.tsx(전형별 통과율)가
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

  // waiting = 아직 도달하지 않음(제외), in_progress/passed/failed = 도달함.
  // passed/failed만 통과율 계산에 쓰고, in_progress(아직 결과 미정)는 도달 수에만 반영한다.
  return stepNames.map((name) => {
    let reached = 0;
    let passed = 0;
    let failed = 0;

    for (const company of companies) {
      const companySteps = stepsByCompany.get(company.id) ?? [];
      const targetStep = companySteps.find((s) => s.name === name);
      if (!targetStep || targetStep.stepStatus === "waiting") continue;

      reached += 1;
      if (targetStep.stepStatus === "passed") passed += 1;
      else if (targetStep.stepStatus === "failed") failed += 1;
    }

    const decided = passed + failed;
    const passRate = decided > 0 ? Math.round((passed / decided) * 1000) / 10 : 0;

    return {
      name,
      stepKey: stepKeyByName.get(name) ?? null,
      count: reached,
      passedCount: passed,
      failedCount: failed,
      passRate,
    };
  });
}
