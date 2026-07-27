/** 지출 관련 순수 로직. */

import type { Expense } from "../types";

/** 최신순 정렬 — `createdAt` 내림차순, 같으면 `date` 내림차순 (원본은 그대로 둔다) */
export function sortExpensesByRecency(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.date < b.date ? 1 : -1;
  });
}
