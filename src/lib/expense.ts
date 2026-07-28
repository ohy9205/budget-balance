/** 지출 관련 순수 로직. */

import type { Expense, NewExpenseInput } from "../types";

/** 빈 메모는 저장하지 않는다 (공백만 입력한 경우 포함) */
function normalizeMemo(memo: string | undefined): string | undefined {
  const trimmed = memo?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * 새 지출 생성. 금액은 정수 원으로 맞춘다.
 * `id`·`createdAt`은 순수 함수로 만들 수 없어 호출부가 발급해 넣어 준다.
 */
export function createExpense(
  input: NewExpenseInput,
  id: string,
  createdAt: string,
): Expense {
  return {
    id,
    categoryId: input.categoryId,
    amount: Math.round(input.amount),
    spentAt: input.spentAt,
    memo: normalizeMemo(input.memo),
    createdAt,
  };
}

/** 기존 지출에 입력값을 반영한 새 객체 (`id`·`createdAt`은 원본 유지) */
export function applyExpenseInput(expense: Expense, input: NewExpenseInput): Expense {
  return {
    ...expense,
    categoryId: input.categoryId,
    amount: Math.round(input.amount),
    spentAt: input.spentAt,
    memo: normalizeMemo(input.memo),
  };
}

/** 최신순 정렬 — `createdAt` 내림차순, 같으면 `spentAt` 내림차순 (원본은 그대로 둔다) */
export function sortExpensesByRecency(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.spentAt < b.spentAt ? 1 : -1;
  });
}
