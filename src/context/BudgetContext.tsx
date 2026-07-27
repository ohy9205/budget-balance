import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  BudgetStore,
  CategoryPatch,
  MonthlyBudgetData,
  NewCategoryInput,
  NewExpenseInput,
  Prefs,
} from "../types";
import {
  createCategory,
  moveCategoryInList,
  moveCategoryToIndex,
  resetCategoryToSeed,
} from "../lib/category";
import { addMonth, getMonthKey } from "../lib/date";
import { applyExpenseInput, createExpense } from "../lib/expense";
import { newId } from "../lib/id";
import {
  copyBudgetFrom,
  createSeededMonth,
  findPreviousMonthWithData,
  removeMonth,
} from "../lib/month";
import { loadPrefs, loadStore, savePrefs, saveStore } from "../lib/storage";

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
  updateCategory: (id: string, patch: CategoryPatch) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, direction: "up" | "down") => void;
  /** 항목을 `toIndex` 자리로 옮긴다 (드래그 정렬용). 범위 밖 인덱스는 잘라 낸다. */
  reorderCategory: (id: string, toIndex: number) => void;
  /** 기본 항목의 이름·월 예산·목표 1회 지출액을 기본 예산값으로 되돌린다 (지출은 그대로) */
  resetCategoryToDefault: (id: string) => void;

  resetCurrentMonth: () => void;
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

  const previousMonthWithData = useMemo(
    () => findPreviousMonthWithData(store.months, currentMonth),
    [store.months, currentMonth],
  );

  /** 현재 월 데이터를 갱신하는 헬퍼 (없으면 무시) */
  function mutateMonth(fn: (data: MonthlyBudgetData) => MonthlyBudgetData) {
    setStore((prev) => {
      const existing = prev.months[currentMonth];
      if (!existing) return prev;
      return { ...prev, months: { ...prev.months, [currentMonth]: fn(existing) } };
    });
  }

  function goToPreviousMonth() {
    setCurrentMonth((m) => addMonth(m, -1));
  }

  function goToNextMonth() {
    setCurrentMonth((m) => addMonth(m, 1));
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
      const source = findPreviousMonthWithData(prev.months, currentMonth);
      if (!source) return prev;
      return {
        ...prev,
        months: {
          ...prev.months,
          [currentMonth]: copyBudgetFrom(prev.months[source], currentMonth),
        },
      };
    });
  }

  function addExpense(input: NewExpenseInput) {
    const expense = createExpense(input, newId(), new Date().toISOString());
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
      expenses: data.expenses.map((e) => (e.id === id ? applyExpenseInput(e, input) : e)),
    }));
  }

  function deleteExpense(id: string) {
    mutateMonth((data) => ({ ...data, expenses: data.expenses.filter((e) => e.id !== id) }));
  }

  function addCategory(input: NewCategoryInput) {
    mutateMonth((data) => ({
      ...data,
      categories: [...data.categories, createCategory(input, data.categories, newId())],
    }));
  }

  function updateCategory(id: string, patch: CategoryPatch) {
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
      const categories = moveCategoryInList(data.categories, id, direction);
      // 옮길 수 없었으면 원본 배열이 그대로 온다 → 상태를 건드리지 않는다
      return categories === data.categories ? data : { ...data, categories };
    });
  }

  function reorderCategory(id: string, toIndex: number) {
    mutateMonth((data) => {
      const categories = moveCategoryToIndex(data.categories, id, toIndex);
      return categories === data.categories ? data : { ...data, categories };
    });
  }

  function resetCategoryToDefault(id: string) {
    mutateMonth((data) => ({ ...data, categories: resetCategoryToSeed(data.categories, id) }));
  }

  function resetCurrentMonth() {
    setStore((prev) => ({ ...prev, months: removeMonth(prev.months, currentMonth) }));
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
    reorderCategory,
    resetCategoryToDefault,
    resetCurrentMonth,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget must be used within a BudgetProvider");
  return ctx;
}
