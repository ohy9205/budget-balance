import type { BudgetCategory, Expense, MonthlyBudgetData } from "../types";
import { STATUS_THRESHOLDS } from "../constants";
import { sortByOrder } from "./category";

export type BudgetStatus = "normal" | "caution" | "warning" | "exhausted" | "over";

/** 뱃지에 쓰는 짧은 라벨 */
export const STATUS_LABEL: Record<BudgetStatus, string> = {
  normal: "여유",
  caution: "주의",
  warning: "위험",
  exhausted: "소진",
  over: "초과",
};

/** 사용자에게 상태를 설명하는 문구 */
export const STATUS_MESSAGE: Record<BudgetStatus, string> = {
  normal: "아직 충분히 남았어요",
  caution: "예산을 많이 사용했어요",
  warning: "예산이 얼마 남지 않았어요",
  exhausted: "이번 달 예산을 모두 사용했어요",
  over: "예산을 초과했어요",
};

/**
 * 사용률(%) → 상태.
 * <70 여유 / 70~<90 주의 / 90~<100 위험 / ==100 소진 / >100 초과
 */
export function statusFromUsageRate(usageRate: number): BudgetStatus {
  if (usageRate > STATUS_THRESHOLDS.exhausted) return "over";
  if (usageRate === STATUS_THRESHOLDS.exhausted) return "exhausted";
  if (usageRate >= STATUS_THRESHOLDS.warning) return "warning";
  if (usageRate >= STATUS_THRESHOLDS.caution) return "caution";
  return "normal";
}

/**
 * 사용률(%) = 사용액 ÷ 예산 × 100.
 * 예산이 0인데 지출이 있으면 Infinity 대신 `100 + 사용액`을 반환해
 * 포맷을 깨지 않으면서 "초과"로 정렬되게 한다.
 */
export function computeUsageRate(used: number, budget: number): number {
  if (budget > 0) return (used / budget) * 100;
  return used > 0 ? 100 + used : 0;
}

/** 남은 예산으로 더 쓸 수 있는 횟수 */
export function remainingUseCount(remaining: number, targetAmountPerUse: number): number {
  return Math.max(0, Math.floor(remaining / targetAmountPerUse));
}

/** 항목 예산 합계 = 총생활비 */
export function totalBudget(categories: BudgetCategory[]): number {
  return categories.reduce((sum, c) => sum + c.budget, 0);
}

/** 특정 항목의 총 사용액 */
function categoryUsed(expenses: Expense[], categoryId: string): number {
  return expenses.reduce(
    (sum, e) => (e.categoryId === categoryId ? sum + e.amount : sum),
    0,
  );
}

export interface CategoryStats {
  category: BudgetCategory;
  budget: number;
  used: number;
  /** 남은 금액 (초과 시 음수) */
  remaining: number;
  /** 사용률(%). 예산이 0이면 사용액이 있을 때 Infinity 대신 100 초과 처리 */
  usageRate: number;
  status: BudgetStatus;
  /** 1회 사용 목표 금액이 있을 때만: 남은 사용 가능 횟수. 없으면 undefined */
  remainingCount?: number;
}

/** 항목 하나의 통계 계산 */
export function categoryStats(category: BudgetCategory, expenses: Expense[]): CategoryStats {
  const budget = category.budget;
  const used = categoryUsed(expenses, category.id);
  const remaining = budget - used;
  const usageRate = computeUsageRate(used, budget);
  const status = statusFromUsageRate(usageRate);

  const target = category.targetAmountPerUse;
  const remainingCount = target && target > 0 ? remainingUseCount(remaining, target) : undefined;

  return { category, budget, used, remaining, usageRate, status, remainingCount };
}

/** 정렬된 항목 통계 목록 */
export function allCategoryStats(data: MonthlyBudgetData): CategoryStats[] {
  return sortByOrder(data.categories).map((c) => categoryStats(c, data.expenses));
}

/** 예산 대비 결과 미리보기 */
export interface BudgetPreview {
  remaining: number;
  over: boolean;
}

/** 이 금액을 등록하면 남는 금액과 초과 여부 */
export function previewExpenseImpact(stats: CategoryStats, amount: number): BudgetPreview {
  const remaining = stats.remaining - amount;
  return { remaining, over: remaining < 0 };
}

/** 예산을 이 금액으로 바꾸면 남는 금액과 초과 여부 */
export function previewBudgetChange(stats: CategoryStats, nextBudget: number): BudgetPreview {
  const remaining = nextBudget - stats.used;
  return { remaining, over: remaining < 0 };
}

export interface MonthlySummary {
  totalBudget: number;
  totalUsed: number;
  totalRemaining: number;
  totalRate: number;
}

/** 월 전체 요약 (전체 예산/사용/잔액/사용률) */
export function monthlySummary(data: MonthlyBudgetData): MonthlySummary {
  const budget = totalBudget(data.categories);
  const totalUsed = data.expenses.reduce((s, e) => s + e.amount, 0);

  return {
    totalBudget: budget,
    totalUsed,
    totalRemaining: budget - totalUsed,
    totalRate: computeUsageRate(totalUsed, budget),
  };
}
