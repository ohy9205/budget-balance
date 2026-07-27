import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  BudgetCategory,
  BudgetStore,
  Expense,
  MonthlyBudgetData,
  NewCategoryInput,
  NewExpenseInput,
  Prefs,
} from "../types";
import { findCategorySeed } from "../constants";
import { sortByOrder } from "../lib/calculations";
import { getMonthKey } from "../lib/date";
import {
  copyBudgetFrom,
  createSeededMonth,
  loadPrefs,
  loadStore,
  newId,
  savePrefs,
  saveStore,
} from "../lib/storage";

export interface BudgetContextValue {
  currentMonth: string;
  /** 현재 선택된 월의 데이터 (없으면 null → "예산 생성" 필요 상태) */
  monthData: MonthlyBudgetData | null;
  /** 데이터가 존재하는 이전 월 (지난달 복사 기능용). 없으면 null */
  previousMonthWithData: string | null;
  prefs: Prefs;

  goToPreviousMonth: () => void;
  goToNextMonth: () => void;

  createEmptyMonthFromSeed: () => void;
  copyFromPreviousMonth: () => void;

  addExpense: (input: NewExpenseInput) => void;
  updateExpense: (id: string, input: NewExpenseInput) => void;
  deleteExpense: (id: string) => void;

  addCategory: (input: NewCategoryInput) => void;
  /** `seedKey`는 기본값을 찾아가는 참조이므로 수정 대상에서 제외한다 */
  updateCategory: (id: string, patch: Partial<Omit<BudgetCategory, "id" | "seedKey">>) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, direction: "up" | "down") => void;
  /** 기본 항목의 이름·월 예산·목표 1회 지출액을 기본 예산값으로 되돌린다 (지출은 그대로) */
  resetCategoryToDefault: (id: string) => void;

  resetCurrentMonth: () => void;
  exportStore: () => BudgetStore;
  importStore: (store: BudgetStore) => void;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<BudgetStore>(() => loadStore());
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [currentMonth, setCurrentMonth] = useState<string>(() => getMonthKey());

  // store / prefs 변경 시 localStorage에 영속화
  useEffect(() => {
    saveStore(store);
  }, [store]);
  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const monthData = store.months[currentMonth] ?? null;

  const previousMonthWithData = useMemo(() => {
    const earlier = Object.keys(store.months)
      .filter((m) => m < currentMonth)
      .sort();
    return earlier.length > 0 ? earlier[earlier.length - 1] : null;
  }, [store.months, currentMonth]);

  /** 현재 월 데이터를 갱신하는 헬퍼 (없으면 무시) */
  function mutateMonth(fn: (data: MonthlyBudgetData) => MonthlyBudgetData) {
    setStore((prev) => {
      const existing = prev.months[currentMonth];
      if (!existing) return prev;
      return { ...prev, months: { ...prev.months, [currentMonth]: fn(existing) } };
    });
  }

  function goToPreviousMonth() {
    setCurrentMonth((m) => {
      const [y, mm] = m.split("-").map(Number);
      const d = new Date(y, mm - 2, 1);
      return getMonthKey(d);
    });
  }

  function goToNextMonth() {
    setCurrentMonth((m) => {
      const [y, mm] = m.split("-").map(Number);
      const d = new Date(y, mm, 1);
      return getMonthKey(d);
    });
  }

  function createEmptyMonthFromSeed() {
    setStore((prev) => {
      if (prev.months[currentMonth]) return prev;
      return {
        ...prev,
        months: { ...prev.months, [currentMonth]: createSeededMonth(currentMonth) },
      };
    });
  }

  function copyFromPreviousMonth() {
    setStore((prev) => {
      if (prev.months[currentMonth]) return prev;
      const earlier = Object.keys(prev.months)
        .filter((m) => m < currentMonth)
        .sort();
      if (earlier.length === 0) return prev;
      const source = prev.months[earlier[earlier.length - 1]];
      return {
        ...prev,
        months: { ...prev.months, [currentMonth]: copyBudgetFrom(source, currentMonth) },
      };
    });
  }

  function addExpense(input: NewExpenseInput) {
    const expense: Expense = {
      id: newId(),
      categoryId: input.categoryId,
      amount: Math.round(input.amount),
      paymentMethod: input.paymentMethod,
      date: input.date,
      memo: input.memo?.trim() ? input.memo.trim() : undefined,
      createdAt: new Date().toISOString(),
    };
    mutateMonth((data) => ({ ...data, expenses: [...data.expenses, expense] }));
    setPrefs((p) => ({
      ...p,
      lastCategoryId: input.categoryId,
      lastPaymentMethod: input.paymentMethod,
    }));
  }

  function updateExpense(id: string, input: NewExpenseInput) {
    mutateMonth((data) => ({
      ...data,
      expenses: data.expenses.map((e) =>
        e.id === id
          ? {
              ...e,
              categoryId: input.categoryId,
              amount: Math.round(input.amount),
              paymentMethod: input.paymentMethod,
              date: input.date,
              memo: input.memo?.trim() ? input.memo.trim() : undefined,
            }
          : e,
      ),
    }));
  }

  function deleteExpense(id: string) {
    mutateMonth((data) => ({ ...data, expenses: data.expenses.filter((e) => e.id !== id) }));
  }

  function addCategory(input: NewCategoryInput) {
    mutateMonth((data) => {
      const maxOrder = data.categories.reduce((m, c) => Math.max(m, c.sortOrder), -1);
      const category: BudgetCategory = {
        id: newId(),
        name: input.name.trim(),
        monthlyBudget: Math.max(0, Math.round(input.monthlyBudget)),
        targetExpenseAmount:
          input.targetExpenseAmount && input.targetExpenseAmount > 0
            ? Math.round(input.targetExpenseAmount)
            : undefined,
        sortOrder: maxOrder + 1,
        // 직접 추가한 항목은 기본 예산에 대응하는 값이 없다 (되돌리기 대상 아님)
      };
      return { ...data, categories: [...data.categories, category] };
    });
  }

  function updateCategory(id: string, patch: Partial<Omit<BudgetCategory, "id" | "seedKey">>) {
    mutateMonth((data) => ({
      ...data,
      categories: data.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function deleteCategory(id: string) {
    // 항목 삭제 시 해당 항목의 지출도 함께 삭제 (고아 지출 방지)
    mutateMonth((data) => ({
      ...data,
      categories: data.categories.filter((c) => c.id !== id),
      expenses: data.expenses.filter((e) => e.categoryId !== id),
    }));
  }

  function moveCategory(id: string, direction: "up" | "down") {
    mutateMonth((data) => {
      const sorted = sortByOrder(data.categories);
      const idx = sorted.findIndex((c) => c.id === id);
      if (idx === -1) return data;
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= sorted.length) return data;
      [sorted[idx], sorted[swapWith]] = [sorted[swapWith], sorted[idx]];
      // sortOrder 재부여
      const reordered = sorted.map((c, i) => ({ ...c, sortOrder: i }));
      return { ...data, categories: reordered };
    });
  }

  function resetCategoryToDefault(id: string) {
    // 지출·정렬 순서는 건드리지 않고 설정값(이름/월 예산/목표액)만 기본 예산값으로 복원
    mutateMonth((data) => ({
      ...data,
      categories: data.categories.map((c) => {
        if (c.id !== id) return c;
        const seed = findCategorySeed(c.seedKey);
        if (!seed) return c; // 직접 추가한 항목은 되돌릴 기본값이 없다
        return {
          ...c,
          name: seed.name,
          monthlyBudget: seed.monthlyBudget,
          targetExpenseAmount: seed.targetExpenseAmount,
        };
      }),
    }));
  }

  function resetCurrentMonth() {
    setStore((prev) => {
      const next = { ...prev.months };
      delete next[currentMonth];
      return { ...prev, months: next };
    });
  }

  function exportStore() {
    return store;
  }

  function importStore(imported: BudgetStore) {
    setStore(imported);
  }

  const value: BudgetContextValue = {
    currentMonth,
    monthData,
    previousMonthWithData,
    prefs,
    goToPreviousMonth,
    goToNextMonth,
    createEmptyMonthFromSeed,
    copyFromPreviousMonth,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    resetCategoryToDefault,
    resetCurrentMonth,
    exportStore,
    importStore,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget must be used within a BudgetProvider");
  return ctx;
}
