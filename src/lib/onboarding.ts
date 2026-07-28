/** 최초 설정(온보딩) 순수 로직. */

import type { NewCategoryInput, OnboardingCategoryDraft, OnboardingDraft } from "../types";
import { buildNewCategoryInput } from "./category";

/** 이름이 같으면 같은 항목이다 — 온보딩 중에는 아직 id가 없다. */
const sameName = (category: OnboardingCategoryDraft, name: string) => category.name === name;

/** 추천 항목 선택/해제. 없으면 목록 끝에 넣고, 있으면 뺀다. */
export function toggleDraftCategory(
  categories: OnboardingCategoryDraft[],
  name: string,
): OnboardingCategoryDraft[] {
  if (categories.some((c) => sameName(c, name))) {
    return categories.filter((c) => !sameName(c, name));
  }
  return [...categories, { name, budget: undefined }];
}

/** 직접 추가할 수 있는 이름인지 — 비어 있거나 이미 있는 이름은 받지 않는다. */
export function canAddDraftCategory(
  categories: OnboardingCategoryDraft[],
  name: string,
): boolean {
  const trimmed = name.trim();
  return trimmed.length > 0 && !categories.some((c) => sameName(c, trimmed));
}

/** 항목 하나의 금액 수정 */
export function updateDraftCategory(
  categories: OnboardingCategoryDraft[],
  name: string,
  patch: Partial<Pick<OnboardingCategoryDraft, "budget" | "targetAmountPerUse">>,
): OnboardingCategoryDraft[] {
  return categories.map((c) => (sameName(c, name) ? { ...c, ...patch } : c));
}

/** 입력 중인 총생활비. 아직 비어 있는 칸은 0으로 센다. */
export function draftTotalBudget(categories: OnboardingCategoryDraft[]): number {
  return categories.reduce((sum, c) => sum + (c.budget ?? 0), 0);
}

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
