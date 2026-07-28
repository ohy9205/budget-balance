/** 최초 설정(온보딩) 순수 로직. */

import type { NewCategoryInput, OnboardingDraft } from "../types";
import { buildNewCategoryInput } from "./category";

/**
 * 온보딩 입력 → 항목 생성 입력값 목록. 만들 수 없으면 null이다.
 * 항목이 하나도 없거나, 이름·예산이 규칙에 어긋나거나, 이름이 겹치면 거부한다.
 */
export function buildOnboardingPlan(draft: OnboardingDraft): NewCategoryInput[] | null {
  if (draft.categories.length === 0) return null;

  const inputs: NewCategoryInput[] = [];
  for (const category of draft.categories) {
    const input = buildNewCategoryInput({
      name: category.name,
      icon: category.icon,
      budget: category.budget,
      targetAmountPerUse: category.targetAmountPerUse,
    });
    if (!input) return null;
    if (inputs.some((i) => i.name === input.name)) return null;
    inputs.push(input);
  }
  return inputs;
}
