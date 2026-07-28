import type { BudgetCategory } from "./types";

export const STORAGE_KEY = "budget-balance:data:v2";
export const PREFS_KEY = "budget-balance:prefs:v1";
export const STORE_VERSION = 2;

/** 기본 예산 항목 정의. `key`는 저장된 항목이 자기 기본값을 찾아갈 때 쓰는 불변 식별자. */
export interface CategorySeed extends Omit<BudgetCategory, "id" | "seedKey"> {
  key: string;
}

/** 최초 설정에서 고르는 추천 항목 (= 예산을 입력하지 않고 만든 달의 기본값) */
export const DEFAULT_CATEGORY_SEED: CategorySeed[] = [
  { key: "meal", name: "식비", budget: 400000, targetAmountPerUse: 12000, sortOrder: 0 },
  { key: "cafe", name: "카페·간식", budget: 100000, targetAmountPerUse: 6000, sortOrder: 1 },
  { key: "transport", name: "교통", budget: 80000, sortOrder: 2 },
  { key: "groceries", name: "장보기·생필품", budget: 150000, sortOrder: 3 },
  { key: "shopping", name: "쇼핑·의류", budget: 100000, sortOrder: 4 },
  { key: "culture", name: "문화·여가", budget: 100000, targetAmountPerUse: 20000, sortOrder: 5 },
  { key: "health", name: "건강·의료", budget: 50000, sortOrder: 6 },
  { key: "subscription", name: "구독·통신", budget: 50000, sortOrder: 7 },
  { key: "etc", name: "경조사·기타", budget: 70000, sortOrder: 8 },
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
