import { createContext, useContext, useState, type ReactNode } from "react";
import type { OnboardingCategoryDraft } from "../types";
import { toggleDraftCategory, updateDraftCategory } from "../lib/onboarding";

export interface OnboardingContextValue {
  categories: OnboardingCategoryDraft[];
  /** 추천 항목 선택/해제 겸 직접 추가 */
  toggleCategory: (name: string) => void;
  setBudget: (name: string, budget: number | undefined) => void;
  setTargetAmountPerUse: (name: string, amount: number | undefined) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/** 최초 설정 3화면이 공유하는 입력값. 저장은 마지막 화면에서 한 번만 한다. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<OnboardingCategoryDraft[]>([]);

  const value: OnboardingContextValue = {
    categories,
    toggleCategory: (name) => setCategories((prev) => toggleDraftCategory(prev, name)),
    setBudget: (name, budget) =>
      setCategories((prev) => updateDraftCategory(prev, name, { budget })),
    setTargetAmountPerUse: (name, amount) =>
      setCategories((prev) => updateDraftCategory(prev, name, { targetAmountPerUse: amount })),
  };

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within an OnboardingProvider");
  return ctx;
}
