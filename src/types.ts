export interface BudgetCategory {
  id: string;
  name: string;
  /** 아이콘 키 (선택) */
  icon?: string;
  /** 월 예산 (정수, 원 단위) */
  budget: number;
  /** 1회 사용 목표 금액 (정수, 원 단위). 없으면 남은 사용 가능 횟수를 계산하지 않는다. */
  targetAmountPerUse?: number;
  /** 카드 정렬 순서 (오름차순) */
  sortOrder: number;
  /**
   * 기본 예산 항목(`DEFAULT_CATEGORY_SEED`)에서 온 항목이면 그 시드 키.
   * 이름을 바꿔도 기본값을 찾아갈 수 있게 하는 참조이며, 직접 추가한 항목에는 없다.
   */
  seedKey?: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  /** 지출 금액 (정수, 원 단위, 0보다 큼) */
  amount: number;
  /** 지출 날짜 "YYYY-MM-DD" */
  spentAt: string;
  memo?: string;
  /** 생성 시각 ISO 문자열 — 최근순 정렬에 사용 */
  createdAt: string;
}

export interface MonthlyBudgetData {
  /** "YYYY-MM" */
  month: string;
  categories: BudgetCategory[];
  expenses: Expense[];
}

/** localStorage 루트 저장 구조 */
export interface BudgetStore {
  version: number;
  months: Record<string, MonthlyBudgetData>;
}

/** 지출 추가·수정 입력값 (금액은 정수 원 단위) */
export interface NewExpenseInput {
  categoryId: string;
  amount: number;
  /** "YYYY-MM-DD" */
  spentAt: string;
  memo?: string;
}

/** 항목 추가 입력값 (금액은 정수 원 단위) */
export interface NewCategoryInput {
  name: string;
  icon?: string;
  budget: number;
  targetAmountPerUse?: number;
}

/** 항목 수정 입력값. `seedKey`는 기본값을 찾아가는 참조이므로 수정 대상에서 제외한다. */
export type CategoryPatch = Partial<Omit<BudgetCategory, "id" | "seedKey">>;

/** 온보딩에서 설정 중인 항목 하나. 금액 칸이 비어 있으면 undefined다. */
export interface OnboardingCategoryDraft {
  name: string;
  icon?: string;
  budget: number | undefined;
  targetAmountPerUse?: number;
}

/** 온보딩 3단계를 거치며 모은 입력값 */
export interface OnboardingDraft {
  categories: OnboardingCategoryDraft[];
}

/** 최근 사용 값 기억 (빠른 입력 편의) */
export interface Prefs {
  lastCategoryId?: string;
}
