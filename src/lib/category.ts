/** 예산 항목(카테고리) 관련 순수 로직. */

import type { BudgetCategory, NewCategoryInput } from "../types";
import { findCategorySeed } from "../constants";
import { formatCurrency } from "./format";

/** 지출은 남았는데 항목이 삭제된 경우 표시할 이름 */
const UNKNOWN_CATEGORY_NAME = "(삭제된 항목)";

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
