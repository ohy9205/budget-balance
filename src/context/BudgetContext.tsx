import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  BudgetCategory,
  BudgetStore,
  Expense,
  MonthlyBudgetData,
  PaymentMethod,
  Prefs,
} from "../types";
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

export interface NewExpenseInput {
  categoryId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  memo?: string;
}

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

  addCategory: (data: { name: string; monthlyBudget: number; targetExpenseAmount?: number }) => void;
  updateCategory: (id: string, patch: Partial<Omit<BudgetCategory, "id">>) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, direction: "up" | "down") => void;

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
  const mutateMonth = useCallback(
    (fn: (data: MonthlyBudgetData) => MonthlyBudgetData) => {
      setStore((prev) => {
        const existing = prev.months[currentMonth];
        if (!existing) return prev;
        return { ...prev, months: { ...prev.months, [currentMonth]: fn(existing) } };
      });
    },
    [currentMonth],
  );

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((m) => {
      const [y, mm] = m.split("-").map(Number);
      const d = new Date(y, mm - 2, 1);
      return getMonthKey(d);
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      const [y, mm] = m.split("-").map(Number);
      const d = new Date(y, mm, 1);
      return getMonthKey(d);
    });
  }, []);

  const createEmptyMonthFromSeed = useCallback(() => {
    setStore((prev) => {
      if (prev.months[currentMonth]) return prev;
      return {
        ...prev,
        months: { ...prev.months, [currentMonth]: createSeededMonth(currentMonth) },
      };
    });
  }, [currentMonth]);

  const copyFromPreviousMonth = useCallback(() => {
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
  }, [currentMonth]);

  const addExpense = useCallback(
    (input: NewExpenseInput) => {
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
    },
    [mutateMonth],
  );

  const updateExpense = useCallback(
    (id: string, input: NewExpenseInput) => {
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
    },
    [mutateMonth],
  );

  const deleteExpense = useCallback(
    (id: string) => {
      mutateMonth((data) => ({ ...data, expenses: data.expenses.filter((e) => e.id !== id) }));
    },
    [mutateMonth],
  );

  const addCategory = useCallback(
    (input: { name: string; monthlyBudget: number; targetExpenseAmount?: number }) => {
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
        };
        return { ...data, categories: [...data.categories, category] };
      });
    },
    [mutateMonth],
  );

  const updateCategory = useCallback(
    (id: string, patch: Partial<Omit<BudgetCategory, "id">>) => {
      mutateMonth((data) => ({
        ...data,
        categories: data.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    [mutateMonth],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      // 항목 삭제 시 해당 항목의 지출도 함께 삭제 (고아 지출 방지)
      mutateMonth((data) => ({
        ...data,
        categories: data.categories.filter((c) => c.id !== id),
        expenses: data.expenses.filter((e) => e.categoryId !== id),
      }));
    },
    [mutateMonth],
  );

  const moveCategory = useCallback(
    (id: string, direction: "up" | "down") => {
      mutateMonth((data) => {
        const sorted = [...data.categories].sort((a, b) => a.sortOrder - b.sortOrder);
        const idx = sorted.findIndex((c) => c.id === id);
        if (idx === -1) return data;
        const swapWith = direction === "up" ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= sorted.length) return data;
        [sorted[idx], sorted[swapWith]] = [sorted[swapWith], sorted[idx]];
        // sortOrder 재부여
        const reordered = sorted.map((c, i) => ({ ...c, sortOrder: i }));
        return { ...data, categories: reordered };
      });
    },
    [mutateMonth],
  );

  const resetCurrentMonth = useCallback(() => {
    setStore((prev) => {
      const next = { ...prev.months };
      delete next[currentMonth];
      return { ...prev, months: next };
    });
  }, [currentMonth]);

  const exportStore = useCallback(() => store, [store]);

  const importStore = useCallback((imported: BudgetStore) => {
    setStore(imported);
  }, []);

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
