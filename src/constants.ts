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

/** 앱 최초 실행 시 사용하는 기본 예산 항목 */
export const DEFAULT_CATEGORY_SEED: Omit<BudgetCategory, "id">[] = [
  { name: "평일 만남 식비", monthlyBudget: 270000, targetExpenseAmount: 25000, sortOrder: 0 },
  { name: "토요일 데이트", monthlyBudget: 250000, targetExpenseAmount: 50000, sortOrder: 1 },
  { name: "장보기", monthlyBudget: 100000, sortOrder: 2 },
  { name: "교통비", monthlyBudget: 80000, sortOrder: 3 },
  { name: "통신·구독", monthlyBudget: 30000, sortOrder: 4 },
  { name: "쇼핑·미용·생활용품", monthlyBudget: 70000, sortOrder: 5 },
  { name: "병원·기타", monthlyBudget: 70000, sortOrder: 6 },
];

/** 사용률 상태 임계값 (%) */
export const STATUS_THRESHOLDS = {
  caution: 60, // 이상: 주의
  warning: 80, // 이상: 위험
  over: 100, // 초과: 예산 초과
} as const;

/** 지출 속도 경고 기준: 사용률이 월 진행률보다 이 수치(%p) 이상 높으면 경고 */
export const FAST_PACE_THRESHOLD_PP = 15;
