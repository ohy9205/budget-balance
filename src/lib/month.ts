/** 월 저장소(`BudgetStore.months`)를 다루는 순수 로직. */

import type { MonthlyBudgetData } from "../types";

/**
 * 주어진 월보다 앞선 월 중 데이터가 있는 가장 최근 월 ("지난달 복사"의 원본). 없으면 null.
 * 월 키가 "YYYY-MM"이라 문자열 비교만으로 시간 순서가 나온다.
 */
export function findPreviousMonthWithData(
  months: Record<string, MonthlyBudgetData>,
  month: string,
): string | null {
  const earlier = Object.keys(months)
    .filter((m) => m < month)
    .sort();
  return earlier.length > 0 ? earlier[earlier.length - 1] : null;
}
