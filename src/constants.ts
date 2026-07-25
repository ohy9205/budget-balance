import type { BudgetCategory, PaymentMethod } from "./types";

export const STORAGE_KEY = "budget-balance:data:v1";
export const PREFS_KEY = "budget-balance:prefs:v1";
export const STORE_VERSION = 1;

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "credit", label: "신용카드" },
  { value: "debit", label: "체크카드" },
];

export function paymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

/** 기본 예산 항목 정의. `key`는 저장된 항목이 자기 기본값을 찾아갈 때 쓰는 불변 식별자. */
export interface CategorySeed extends Omit<BudgetCategory, "id" | "seedKey"> {
  key: string;
}

/** 앱 최초 실행 시 사용하는 기본 예산 항목 (= '기본값으로 되돌리기'의 기준) */
export const DEFAULT_CATEGORY_SEED: CategorySeed[] = [
  {
    key: "weekday-meal",
    name: "평일 만남 식비",
    monthlyBudget: 270000,
    targetExpenseAmount: 25000,
    sortOrder: 0,
  },
  {
    key: "saturday-date",
    name: "토요일 데이트",
    monthlyBudget: 250000,
    targetExpenseAmount: 50000,
    sortOrder: 1,
  },
  { key: "groceries", name: "장보기", monthlyBudget: 100000, sortOrder: 2 },
  { key: "transport", name: "교통비", monthlyBudget: 80000, sortOrder: 3 },
  { key: "telecom", name: "통신·구독", monthlyBudget: 30000, sortOrder: 4 },
  { key: "shopping", name: "쇼핑·미용·생활용품", monthlyBudget: 70000, sortOrder: 5 },
  { key: "medical", name: "병원·기타", monthlyBudget: 70000, sortOrder: 6 },
];

/** 시드 키로 기본값 조회 (없으면 undefined) */
export function findCategorySeed(key: string | undefined): CategorySeed | undefined {
  if (!key) return undefined;
  return DEFAULT_CATEGORY_SEED.find((s) => s.key === key);
}

/** 사용률 상태 임계값 (%) */
export const STATUS_THRESHOLDS = {
  caution: 60, // 이상: 주의
  warning: 80, // 이상: 위험
  over: 100, // 초과: 예산 초과
} as const;

/** 지출 속도 경고 기준: 사용률이 월 진행률보다 이 수치(%p) 이상 높으면 경고 */
export const FAST_PACE_THRESHOLD_PP = 15;
