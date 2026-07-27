import type {
  BudgetCategory,
  BudgetStore,
  Expense,
  MonthlyBudgetData,
  PaymentMethod,
  Prefs,
} from "../types";
import {
  DEFAULT_CATEGORY_SEED,
  findCategorySeed,
  PREFS_KEY,
  STORAGE_KEY,
  STORE_VERSION,
} from "../constants";
import { isValidMonthKey } from "./date";
import { newId } from "./id";

const isPaymentMethod = (v: unknown): v is PaymentMethod => v === "credit" || v === "debit";
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/**
 * 시드 키 정규화. 모르는 키는 버리고, 키가 없는 예전 데이터는 이름으로 기본 항목을 찾아 붙여 준다
 * (이 필드 도입 이전에 만들어진 기본 항목도 기본값으로 되돌릴 수 있게).
 */
function sanitizeSeedKey(raw: unknown, name: string): string | undefined {
  if (isNonEmptyString(raw)) {
    return findCategorySeed(raw)?.key;
  }
  return DEFAULT_CATEGORY_SEED.find((s) => s.name === name)?.key;
}

/** 알 수 없는 값을 안전하게 BudgetCategory로 정규화 (실패 시 null) */
function sanitizeCategory(raw: unknown, index: number): BudgetCategory | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.name)) return null;
  const monthlyBudget = isFiniteNumber(r.monthlyBudget) ? Math.max(0, Math.round(r.monthlyBudget)) : 0;
  const target =
    isFiniteNumber(r.targetExpenseAmount) && r.targetExpenseAmount > 0
      ? Math.round(r.targetExpenseAmount)
      : undefined;
  return {
    id: isNonEmptyString(r.id) ? r.id : newId(),
    name: r.name,
    monthlyBudget,
    targetExpenseAmount: target,
    sortOrder: isFiniteNumber(r.sortOrder) ? r.sortOrder : index,
    seedKey: sanitizeSeedKey(r.seedKey, r.name),
  };
}

/** 알 수 없는 값을 안전하게 Expense로 정규화 (실패 시 null) */
function sanitizeExpense(raw: unknown, validCategoryIds: Set<string>): Expense | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.id)) return null;
  if (!isNonEmptyString(r.categoryId) || !validCategoryIds.has(r.categoryId)) return null;
  if (!isFiniteNumber(r.amount) || r.amount <= 0) return null;
  if (!isPaymentMethod(r.paymentMethod)) return null;
  if (!isNonEmptyString(r.date)) return null;
  return {
    id: r.id,
    categoryId: r.categoryId,
    amount: Math.round(r.amount),
    paymentMethod: r.paymentMethod,
    date: r.date,
    memo: isNonEmptyString(r.memo) ? r.memo : undefined,
    createdAt: isNonEmptyString(r.createdAt) ? r.createdAt : new Date().toISOString(),
  };
}

/** 알 수 없는 값을 안전하게 MonthlyBudgetData로 정규화 (실패 시 null) */
export function sanitizeMonth(raw: unknown, monthKey?: string): MonthlyBudgetData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const month = isNonEmptyString(r.month) ? r.month : monthKey;
  if (!month || !isValidMonthKey(month)) return null;

  const categories: BudgetCategory[] = Array.isArray(r.categories)
    ? (r.categories.map((c, i) => sanitizeCategory(c, i)).filter(Boolean) as BudgetCategory[])
    : [];
  const validIds = new Set(categories.map((c) => c.id));
  const expenses: Expense[] = Array.isArray(r.expenses)
    ? (r.expenses.map((e) => sanitizeExpense(e, validIds)).filter(Boolean) as Expense[])
    : [];

  return { month, categories, expenses };
}

/** 전체 저장소를 방어적으로 파싱. 손상/부재 시 빈 저장소 반환. */
export function loadStore(): BudgetStore {
  const empty: BudgetStore = { version: STORE_VERSION, months: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return empty;
    const p = parsed as Record<string, unknown>;
    const monthsRaw = (p.months ?? {}) as Record<string, unknown>;
    const months: Record<string, MonthlyBudgetData> = {};
    for (const [key, value] of Object.entries(monthsRaw)) {
      const m = sanitizeMonth(value, key);
      if (m) months[m.month] = m;
    }
    return { version: STORE_VERSION, months };
  } catch (err) {
    console.warn("예산 데이터를 불러오지 못했습니다. 기본값으로 시작합니다.", err);
    return empty;
  }
}

export function saveStore(store: BudgetStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn("예산 데이터를 저장하지 못했습니다.", err);
  }
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      lastCategoryId: isNonEmptyString(parsed.lastCategoryId) ? parsed.lastCategoryId : undefined,
      lastPaymentMethod: isPaymentMethod(parsed.lastPaymentMethod)
        ? parsed.lastPaymentMethod
        : undefined,
    };
  } catch {
    return {};
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.warn("설정을 저장하지 못했습니다.", err);
  }
}
