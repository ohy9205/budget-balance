/**
 * 월 데이터(`MonthlyBudgetData`)와 월 저장소(`BudgetStore.months`)를 다루는 순수 로직.
 * 영속화(localStorage)는 [storage.ts](./storage.ts)가 담당한다 — 여기는 값 변환만 한다.
 *
 * id를 발급하는 함수는 `nextId`를 인자로 받는다(기본값 `newId`) — 테스트에서 결정론적인
 * id를 넣기 위한 것이다.
 */

import type { BudgetCategory, MonthlyBudgetData, NewCategoryInput } from "../types";
import { DEFAULT_CATEGORY_SEED } from "../constants";
import { createCategory, sortByOrder } from "./category";
import { newId } from "./id";

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

/** 저장된 월이 하나라도 있는지 — 최초 설정을 마쳤는지의 기준 */
export function hasAnyMonthData(months: Record<string, MonthlyBudgetData>): boolean {
  return Object.keys(months).length > 0;
}

/** 해당 월을 지운 새 저장소 맵 (원본은 그대로 둔다) */
export function removeMonth(
  months: Record<string, MonthlyBudgetData>,
  month: string,
): Record<string, MonthlyBudgetData> {
  const next = { ...months };
  delete next[month];
  return next;
}

/** 기본 시드로 새 월 데이터 생성 */
export function createSeededMonth(
  month: string,
  nextId: () => string = newId,
): MonthlyBudgetData {
  return {
    month,
    categories: DEFAULT_CATEGORY_SEED.map(({ key, ...c }) => ({
      ...c,
      id: nextId(),
      seedKey: key,
    })),
    expenses: [],
  };
}

/** 주어진 항목들로 새 월 데이터 생성 (최초 설정 결과를 저장할 때 쓴다) */
export function createMonthWithCategories(
  month: string,
  inputs: NewCategoryInput[],
  nextId: () => string = newId,
): MonthlyBudgetData {
  const categories = inputs.reduce<BudgetCategory[]>(
    (acc, input) => [...acc, createCategory(input, acc, nextId())],
    [],
  );
  return { month, categories, expenses: [] };
}

/**
 * 다른 월의 예산 항목(금액 포함)만 복사해 새 월 생성.
 * **지출은 복사하지 않고 id는 새로 발급한다** — 월끼리 항목 id를 공유하지 않는다는 불변식.
 */
export function copyBudgetFrom(
  source: MonthlyBudgetData,
  targetMonth: string,
  nextId: () => string = newId,
): MonthlyBudgetData {
  const categories: BudgetCategory[] = sortByOrder(source.categories).map((c) => ({
    id: nextId(),
    name: c.name,
    icon: c.icon,
    budget: c.budget,
    targetAmountPerUse: c.targetAmountPerUse,
    sortOrder: c.sortOrder,
    // 기본 항목 여부는 월을 넘어가도 유지된다 (id만 새로 발급)
    seedKey: c.seedKey,
  }));
  return { month: targetMonth, categories, expenses: [] };
}
