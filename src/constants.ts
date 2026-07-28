import type { BudgetCategory } from "./types";

export const STORAGE_KEY = "budget-balance:data:v2";
export const PREFS_KEY = "budget-balance:prefs:v1";
export const STORE_VERSION = 2;

/** 기본 예산 항목 정의. `key`는 저장된 항목이 자기 기본값을 찾아갈 때 쓰는 불변 식별자. */
export interface CategorySeed extends Omit<BudgetCategory, "id" | "seedKey"> {
  key: string;
}

/** 앱 최초 실행 시 사용하는 기본 예산 항목 (= '기본값으로 되돌리기'의 기준) */
export const DEFAULT_CATEGORY_SEED: CategorySeed[] = [
  {
    key: "weekday-meal",
    name: "평일 데이트",
    budget: 270000,
    targetAmountPerUse: 25000,
    sortOrder: 0,
  },
  {
    key: "saturday-date",
    name: "주말 데이트",
    budget: 250000,
    targetAmountPerUse: 50000,
    sortOrder: 1,
  },
  { key: "groceries", name: "장보기", budget: 100000, sortOrder: 2 },
  { key: "transport", name: "교통비", budget: 80000, sortOrder: 3 },
  { key: "telecom", name: "통신·구독", budget: 30000, sortOrder: 4 },
  { key: "shopping", name: "쇼핑·미용·생활용품", budget: 70000, sortOrder: 5 },
  { key: "medical", name: "병원·기타", budget: 70000, sortOrder: 6 },
];

/** 시드 키로 기본값 조회 (없으면 undefined) */
export function findCategorySeed(key: string | undefined): CategorySeed | undefined {
  if (!key) return undefined;
  return DEFAULT_CATEGORY_SEED.find((s) => s.key === key);
}

/** 사용률 상태 임계값 (%) */
export const STATUS_THRESHOLDS = {
  caution: 70, // 이상: 주의
  warning: 90, // 이상: 위험
  exhausted: 100, // 정확히: 소진 / 넘으면: 초과
} as const;
