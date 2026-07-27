import { describe, expect, it } from "vitest";
import type { MonthlyBudgetData } from "../types";
import {
  allCategoryStats,
  categoryStats,
  computeUsageRate,
  monthlySummary,
  projection,
  statusFromUsageRate,
} from "./calculations";
import { formatCurrency, formatPercent } from "./format";
import { addMonth, daysInMonth } from "./date";

const cat = (id: string, budget: number, target?: number, sortOrder = 0) => ({
  id,
  name: id,
  monthlyBudget: budget,
  targetExpenseAmount: target,
  sortOrder,
});

const exp = (
  id: string,
  categoryId: string,
  amount: number,
  paymentMethod: "credit" | "debit" = "credit",
  date = "2026-07-10",
) => ({ id, categoryId, amount, paymentMethod, date, createdAt: `${date}T00:00:00.000Z` });

describe("computeUsageRate", () => {
  it("예산이 있으면 사용액÷예산×100", () => {
    expect(computeUsageRate(40000, 100000)).toBeCloseTo(40);
    expect(computeUsageRate(0, 100000)).toBe(0);
  });

  it("예산 0 + 지출 있으면 Infinity 대신 100+사용액", () => {
    expect(computeUsageRate(5000, 0)).toBe(5100);
    expect(Number.isFinite(computeUsageRate(5000, 0))).toBe(true);
    expect(statusFromUsageRate(computeUsageRate(5000, 0))).toBe("over");
  });

  it("예산 0 + 지출 0이면 0", () => {
    expect(computeUsageRate(0, 0)).toBe(0);
  });
});

describe("statusFromUsageRate 경계값", () => {
  it("<60 여유", () => expect(statusFromUsageRate(0)).toBe("safe"));
  it("59.9 여유", () => expect(statusFromUsageRate(59.9)).toBe("safe"));
  it("60 주의", () => expect(statusFromUsageRate(60)).toBe("caution"));
  it("79.9 주의", () => expect(statusFromUsageRate(79.9)).toBe("caution"));
  it("80 위험", () => expect(statusFromUsageRate(80)).toBe("warning"));
  it("100 위험", () => expect(statusFromUsageRate(100)).toBe("warning"));
  it(">100 초과", () => expect(statusFromUsageRate(100.1)).toBe("over"));
});

describe("categoryStats", () => {
  it("사용액·잔액·사용률 계산", () => {
    const s = categoryStats(cat("a", 100000), [exp("1", "a", 25000), exp("2", "a", 15000)]);
    expect(s.used).toBe(40000);
    expect(s.remaining).toBe(60000);
    expect(s.usageRate).toBeCloseTo(40);
    expect(s.status).toBe("safe");
  });

  it("남은 사용 가능 횟수: floor(남은/목표), 예시 145000/25000=5", () => {
    const s = categoryStats(cat("a", 270000, 25000), [exp("1", "a", 125000)]);
    expect(s.remaining).toBe(145000);
    expect(s.remainingCount).toBe(5);
  });

  it("목표액 없으면 remainingCount undefined", () => {
    const s = categoryStats(cat("a", 100000), []);
    expect(s.remainingCount).toBeUndefined();
  });

  it("예산 초과 시 잔액 음수·초과 상태·남은횟수 0", () => {
    const s = categoryStats(cat("a", 50000, 10000), [exp("1", "a", 70000)]);
    expect(s.remaining).toBe(-20000);
    expect(s.status).toBe("over");
    expect(s.remainingCount).toBe(0);
  });

  it("다른 항목의 지출은 합산되지 않음", () => {
    const s = categoryStats(cat("a", 100000), [exp("1", "b", 30000), exp("2", "a", 10000)]);
    expect(s.used).toBe(10000);
  });
});

describe("monthlySummary — 결제수단 분리", () => {
  const data: MonthlyBudgetData = {
    month: "2026-07",
    categories: [cat("a", 100000, undefined, 0), cat("b", 50000, undefined, 1)],
    expenses: [
      exp("1", "a", 30000, "credit"),
      exp("2", "a", 20000, "debit"),
      exp("3", "b", 10000, "credit"),
    ],
  };

  it("전체 예산/사용/잔액", () => {
    const s = monthlySummary(data);
    expect(s.totalBudget).toBe(150000);
    expect(s.totalUsed).toBe(60000);
    expect(s.totalRemaining).toBe(90000);
  });

  it("신용/체크 사용액 구분", () => {
    const s = monthlySummary(data);
    expect(s.usedByMethod.credit).toBe(40000);
    expect(s.usedByMethod.debit).toBe(20000);
  });
});

describe("allCategoryStats 정렬", () => {
  it("sortOrder 오름차순", () => {
    const data: MonthlyBudgetData = {
      month: "2026-07",
      categories: [cat("b", 1, undefined, 2), cat("a", 1, undefined, 0), cat("c", 1, undefined, 1)],
      expenses: [],
    };
    expect(allCategoryStats(data).map((s) => s.category.id)).toEqual(["a", "c", "b"]);
  });
});

describe("projection (현재 월만)", () => {
  const data: MonthlyBudgetData = {
    month: "2026-07",
    categories: [cat("a", 310000)],
    expenses: [exp("1", "a", 100000)],
  };

  it("현재 월: 예상 월말 잔액", () => {
    const today = new Date(2026, 6, 10); // 7월 10일, 31일 달
    const p = projection(data, today)!;
    // 하루 평균 100000/10 = 10000 → 예상 사용 10000*31 = 310000 → 예산 310000 - 310000
    expect(p.projectedRemaining).toBeCloseTo(0);
  });

  it("과거/미래 월이면 null", () => {
    expect(projection(data, new Date(2026, 7, 10))).toBeNull(); // 8월 → 07월은 과거
    expect(projection(data, new Date(2026, 5, 10))).toBeNull(); // 6월 → 07월은 미래
  });
});

describe("format & date 유틸", () => {
  it("formatCurrency 쉼표+원", () => {
    expect(formatCurrency(1234567)).toBe("1,234,567원");
    expect(formatCurrency(-20000)).toBe("-20,000원");
  });
  it("formatPercent", () => {
    expect(formatPercent(80)).toBe("80%");
    expect(formatPercent(82.53)).toBe("82.5%");
  });
  it("daysInMonth", () => {
    expect(daysInMonth("2026-07")).toBe(31);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2024-02")).toBe(29);
  });
  it("addMonth 연 경계 넘김", () => {
    expect(addMonth("2026-07", 1)).toBe("2026-08");
    expect(addMonth("2026-12", 1)).toBe("2027-01");
    expect(addMonth("2026-01", -1)).toBe("2025-12");
  });
});
