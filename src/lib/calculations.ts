import type { BudgetCategory, Expense, MonthlyBudgetData, PaymentMethod } from "../types";
import { STATUS_THRESHOLDS } from "../constants";
import { sortByOrder } from "./category";
import { daysInMonth, isCurrentMonth } from "./date";

export type BudgetStatus = "safe" | "caution" | "warning" | "over";

export const STATUS_LABEL: Record<BudgetStatus, string> = {
  safe: "여유",
  caution: "주의",
  warning: "위험",
  over: "초과",
};

/**
 * 사용률(%) → 상태.
 * <60 여유 / 60~<80 주의 / 80~<=100 위험 / >100 초과
 */
export function statusFromUsageRate(usageRate: number): BudgetStatus {
  if (usageRate > STATUS_THRESHOLDS.over) return "over";
  if (usageRate >= STATUS_THRESHOLDS.warning) return "warning";
  if (usageRate >= STATUS_THRESHOLDS.caution) return "caution";
  return "safe";
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

/** 특정 항목의 총 사용액 */
export function categoryUsed(expenses: Expense[], categoryId: string): number {
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
  /** 목표 1회 지출액이 있을 때만: 남은 예산 ÷ 목표액 (버림, 음수면 0). 없으면 undefined */
  remainingCount?: number;
}

/** 항목 하나의 통계 계산 */
export function categoryStats(category: BudgetCategory, expenses: Expense[]): CategoryStats {
  const budget = category.monthlyBudget;
  const used = categoryUsed(expenses, category.id);
  const remaining = budget - used;
  const usageRate = computeUsageRate(used, budget);
  const status = statusFromUsageRate(usageRate);

  let remainingCount: number | undefined;
  if (category.targetExpenseAmount && category.targetExpenseAmount > 0) {
    remainingCount = remaining > 0 ? Math.floor(remaining / category.targetExpenseAmount) : 0;
  }

  return { category, budget, used, remaining, usageRate, status, remainingCount };
}

/** 정렬된 항목 통계 목록 */
export function allCategoryStats(data: MonthlyBudgetData): CategoryStats[] {
  return sortByOrder(data.categories).map((c) => categoryStats(c, data.expenses));
}

export interface MonthlySummary {
  totalBudget: number;
  totalUsed: number;
  totalRemaining: number;
  totalRate: number;
  usedByMethod: Record<PaymentMethod, number>;
}

/** 월 전체 요약 (전체 예산/사용/잔액/사용률 + 결제수단별 사용액) */
export function monthlySummary(data: MonthlyBudgetData): MonthlySummary {
  const totalBudget = data.categories.reduce((s, c) => s + c.monthlyBudget, 0);
  const totalUsed = data.expenses.reduce((s, e) => s + e.amount, 0);
  const totalRemaining = totalBudget - totalUsed;
  const totalRate = computeUsageRate(totalUsed, totalBudget);

  const usedByMethod: Record<PaymentMethod, number> = { credit: 0, debit: 0 };
  for (const e of data.expenses) {
    usedByMethod[e.paymentMethod] = (usedByMethod[e.paymentMethod] ?? 0) + e.amount;
  }

  return { totalBudget, totalUsed, totalRemaining, totalRate, usedByMethod };
}

export interface Projection {
  /** 현재까지 하루 평균 지출액 */
  dailyAverage: number;
  /** 현재 속도 유지 시 예상 월말 사용액 */
  projectedUsed: number;
  /** 예상 월말 잔액 = 전체 예산 - 예상 월말 사용액 */
  projectedRemaining: number;
}

/**
 * 예상 월말 잔액 계산 — 현재 월에만 의미가 있음.
 * 하루 평균 = 사용액 ÷ 오늘 일자, 예상 사용액 = 하루 평균 × 월 전체 일수.
 * 현재 월이 아니면 null.
 */
export function projection(data: MonthlyBudgetData, today: Date = new Date()): Projection | null {
  if (!isCurrentMonth(data.month, today)) return null;

  const summary = monthlySummary(data);
  const dayOfMonth = today.getDate();
  const totalDays = daysInMonth(data.month);

  const dailyAverage = dayOfMonth > 0 ? summary.totalUsed / dayOfMonth : 0;
  const projectedUsed = dailyAverage * totalDays;
  const projectedRemaining = summary.totalBudget - projectedUsed;

  return { dailyAverage, projectedUsed, projectedRemaining };
}
