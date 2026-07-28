import { describe, expect, it } from "vitest";
import type { OnboardingCategoryDraft } from "../types";
import { totalBudget } from "./calculations";
import { buildOnboardingPlan } from "./onboarding";

const draft = (...categories: OnboardingCategoryDraft[]) => ({ categories });

const item = (patch: Partial<OnboardingCategoryDraft> = {}): OnboardingCategoryDraft => ({
  name: "장보기",
  budget: 100000,
  ...patch,
});

describe("buildOnboardingPlan", () => {
  it("항목을 순서대로 정규화해 담는다", () => {
    const plan = buildOnboardingPlan(
      draft(item({ name: "  장보기 " }), item({ name: "교통비", budget: 80000.6 })),
    );
    expect(plan).toEqual([
      { name: "장보기", icon: undefined, budget: 100000, targetAmountPerUse: undefined },
      { name: "교통비", icon: undefined, budget: 80001, targetAmountPerUse: undefined },
    ]);
  });

  it("아이콘·목표액을 함께 담는다", () => {
    const plan = buildOnboardingPlan(draft(item({ icon: "cart", targetAmountPerUse: 25000 })))!;
    expect(plan[0].icon).toBe("cart");
    expect(plan[0].targetAmountPerUse).toBe(25000);
  });

  it("항목이 하나도 없으면 null", () => {
    expect(buildOnboardingPlan(draft())).toBeNull();
  });

  it("예산 칸이 비었거나 0 이하인 항목이 있으면 null", () => {
    expect(buildOnboardingPlan(draft(item(), item({ budget: undefined })))).toBeNull();
    expect(buildOnboardingPlan(draft(item({ budget: 0 })))).toBeNull();
    expect(buildOnboardingPlan(draft(item({ budget: -1 })))).toBeNull();
  });

  it("이름이 빈 항목이 있으면 null", () => {
    expect(buildOnboardingPlan(draft(item({ name: "   " })))).toBeNull();
  });

  it("이름이 겹치면 null (trim 후 비교)", () => {
    expect(buildOnboardingPlan(draft(item(), item({ name: " 장보기" })))).toBeNull();
  });

  it("총생활비는 항목 예산 합계와 같다", () => {
    const plan = buildOnboardingPlan(draft(item(), item({ name: "교통비", budget: 80000 })))!;
    expect(totalBudget(plan.map((p, i) => ({ ...p, id: `${i}`, sortOrder: i })))).toBe(180000);
  });
});
