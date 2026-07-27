/** 예산 항목(카테고리) 관련 순수 로직. */

import type { BudgetCategory, NewCategoryInput } from "../types";
import { findCategorySeed } from "../constants";
import { formatCurrency } from "./format";

/** 지출은 남았는데 항목이 삭제된 경우 표시할 이름 */
const UNKNOWN_CATEGORY_NAME = "(삭제된 항목)";

/**
 * `sortOrder` 오름차순으로 정렬한 새 배열 (원본은 그대로 둔다).
 * 항목은 어디서든 이 순서로 보여 주므로 정렬 비교자는 여기 하나만 둔다.
 */
export function sortByOrder<T extends { sortOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** 기본 예산값과 달라진 설정만 "월 예산 270,000원" 형태로 나열 (기본 항목이 아니거나 같으면 빈 배열) */
export function categoryDefaultDiff(c: BudgetCategory): string[] {
  const seed = findCategorySeed(c.seedKey);
  if (!seed) return [];
  const parts: string[] = [];
  if (c.name !== seed.name) parts.push(`이름 ${seed.name}`);
  if (c.monthlyBudget !== seed.monthlyBudget) {
    parts.push(`월 예산 ${formatCurrency(seed.monthlyBudget)}`);
  }
  if (c.targetExpenseAmount !== seed.targetExpenseAmount) {
    parts.push(
      `목표 1회 지출액 ${
        seed.targetExpenseAmount ? formatCurrency(seed.targetExpenseAmount) : "없음"
      }`,
    );
  }
  return parts;
}

/** 항목 id → 이름 조회 함수. 목록에 없는 id는 "(삭제된 항목)" */
export function buildCategoryNameLookup(
  categories: BudgetCategory[],
): (id: string) => string {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  return (id) => nameById.get(id) ?? UNKNOWN_CATEGORY_NAME;
}

/**
 * 지출 시트를 열 때 선택해 둘 항목 —
 * 원하는 항목(수정 중인 지출 / 최근 사용)이 목록에 있으면 그것, 없으면 첫 항목.
 */
export function resolveInitialCategoryId(
  categories: BudgetCategory[],
  preferredId?: string,
): string {
  if (preferredId && categories.some((c) => c.id === preferredId)) return preferredId;
  return categories[0]?.id ?? "";
}

/** 항목 추가 폼의 입력값. 금액 칸이 비어 있으면 undefined다(`AmountField`가 그렇게 준다). */
export interface NewCategoryFields {
  name: string;
  monthlyBudget: number | undefined;
  targetExpenseAmount: number | undefined;
}

/** 폼 입력 → `addCategory` 입력값. 항목을 만들 수 없으면 null */
export function buildNewCategoryInput(fields: NewCategoryFields): NewCategoryInput | null {
  const name = fields.name.trim();
  const { monthlyBudget, targetExpenseAmount: target } = fields;
  if (!name || monthlyBudget === undefined) return null;
  if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) return null;

  return {
    name,
    monthlyBudget: Math.round(monthlyBudget),
    // 목표액은 선택 입력 — 없거나 0 이하면 "없음"
    targetExpenseAmount: target && target > 0 ? Math.round(target) : undefined,
  };
}

/** 추가 버튼 활성 조건 */
export function isValidNewCategory(fields: NewCategoryFields): boolean {
  return buildNewCategoryInput(fields) !== null;
}

/**
 * 새 항목 생성 — 정렬 순서는 기존 항목 뒤(맨 아래)로, 금액은 정수·음수 방지로 정규화한다.
 * 직접 추가한 항목에는 `seedKey`가 없다(되돌릴 기본값이 없다).
 * `id`는 호출부가 발급해 넣어 준다(순수 함수 유지).
 */
export function createCategory(
  input: NewCategoryInput,
  existing: BudgetCategory[],
  id: string,
): BudgetCategory {
  const maxOrder = existing.reduce((m, c) => Math.max(m, c.sortOrder), -1);
  return {
    id,
    name: input.name.trim(),
    monthlyBudget: Math.max(0, Math.round(input.monthlyBudget)),
    targetExpenseAmount:
      input.targetExpenseAmount && input.targetExpenseAmount > 0
        ? Math.round(input.targetExpenseAmount)
        : undefined,
    sortOrder: maxOrder + 1,
  };
}

/**
 * 항목 한 칸 위/아래로 이동한 새 배열. `sortOrder`는 0부터 다시 부여한다.
 * 옮길 수 없으면(없는 id, 이미 끝) **원본 배열을 그대로 반환**하므로 호출부가 무변경을 알 수 있다.
 */
export function moveCategoryInList(
  categories: BudgetCategory[],
  id: string,
  direction: "up" | "down",
): BudgetCategory[] {
  const sorted = sortByOrder(categories);
  const idx = sorted.findIndex((c) => c.id === id);
  if (idx === -1) return categories;

  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return categories;

  [sorted[idx], sorted[swapWith]] = [sorted[swapWith], sorted[idx]];
  return sorted.map((c, i) => ({ ...c, sortOrder: i }));
}

/**
 * 해당 항목의 설정값(이름/월 예산/목표액)만 기본 예산값으로 되돌린 새 배열.
 * 지출·정렬 순서는 건드리지 않고, 직접 추가한 항목(기본값 없음)은 그대로 둔다.
 */
export function resetCategoryToSeed(
  categories: BudgetCategory[],
  id: string,
): BudgetCategory[] {
  return categories.map((c) => {
    if (c.id !== id) return c;
    const seed = findCategorySeed(c.seedKey);
    if (!seed) return c;
    return {
      ...c,
      name: seed.name,
      monthlyBudget: seed.monthlyBudget,
      targetExpenseAmount: seed.targetExpenseAmount,
    };
  });
}
