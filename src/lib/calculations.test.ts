import { describe, expect, it } from "vitest";
import type { MonthlyBudgetData } from "../types";
import {
  allCategoryStats,
  categoryStats,
  computeUsageRate,
  monthlySummary,
  previewBudgetChange,
  previewExpenseImpact,
  remainingUseCount,
  statusFromUsageRate,
  totalBudget,
} from "./calculations";
import { formatCurrency, formatPercent } from "./format";
import { addMonth } from "./date";

const cat = (id: string, budget: number, target?: number, sortOrder = 0) => ({
  id,
  name: id,
  budget,
  targetAmountPerUse: target,
  sortOrder,
});

const exp = (id: string, categoryId: string, amount: number, spentAt = "2026-07-10") => ({
  id,
  categoryId,
  amount,
  spentAt,
  createdAt: `${spentAt}T00:00:00.000Z`,
});

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
  it("0 여유", () => expect(statusFromUsageRate(0)).toBe("normal"));
  it("69 여유", () => expect(statusFromUsageRate(69)).toBe("normal"));
  it("70 주의", () => expect(statusFromUsageRate(70)).toBe("caution"));
  it("89 주의", () => expect(statusFromUsageRate(89)).toBe("caution"));
  it("90 위험", () => expect(statusFromUsageRate(90)).toBe("warning"));
  it("99 위험", () => expect(statusFromUsageRate(99)).toBe("warning"));
  it("100은 정확히 소진", () => expect(statusFromUsageRate(100)).toBe("exhausted"));
  it("101 초과", () => expect(statusFromUsageRate(101)).toBe("over"));
  it("100을 조금만 넘어도 초과", () => expect(statusFromUsageRate(100.1)).toBe("over"));
});

describe("remainingUseCount", () => {
  it("남은 예산 ÷ 목표액을 버림한다", () => {
    expect(remainingUseCount(145000, 25000)).toBe(5);
    expect(remainingUseCount(24999, 25000)).toBe(0);
  });

  it("남은 예산이 음수면 0", () => {
    expect(remainingUseCount(-20000, 10000)).toBe(0);
  });
});

describe("totalBudget", () => {
  it("항목 예산의 합", () => {
    expect(totalBudget([cat("a", 100000), cat("b", 50000)])).toBe(150000);
  });

  it("항목이 없으면 0", () => {
    expect(totalBudget([])).toBe(0);
  });

  it("항목을 더하거나 빼도 합계와 일치한다", () => {
    const list = [cat("a", 100000), cat("b", 50000)];
    expect(totalBudget([...list, cat("c", 30000)])).toBe(180000);
    expect(totalBudget(list.filter((c) => c.id !== "b"))).toBe(100000);
  });
});

describe("categoryStats", () => {
  it("사용액·잔액·사용률 계산", () => {
    const s = categoryStats(cat("a", 100000), [exp("1", "a", 25000), exp("2", "a", 15000)]);
    expect(s.used).toBe(40000);
    expect(s.remaining).toBe(60000);
    expect(s.usageRate).toBeCloseTo(40);
    expect(s.status).toBe("normal");
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

  it("예산을 딱 맞게 쓰면 소진", () => {
    const s = categoryStats(cat("a", 100000, 10000), [exp("1", "a", 100000)]);
    expect(s.remaining).toBe(0);
    expect(s.status).toBe("exhausted");
    expect(s.remainingCount).toBe(0);
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

describe("previewExpenseImpact", () => {
  const stats = categoryStats(cat("a", 100000), [exp("1", "a", 80000)]);

  it("등록하면 남는 금액", () => {
    expect(previewExpenseImpact(stats, 5000)).toEqual({ remaining: 15000, over: false });
  });

  it("딱 맞게 쓰는 금액은 초과가 아니다", () => {
    expect(previewExpenseImpact(stats, 20000)).toEqual({ remaining: 0, over: false });
  });

  it("예산을 넘기면 초과", () => {
    expect(previewExpenseImpact(stats, 30000)).toEqual({ remaining: -10000, over: true });
  });
});

describe("previewBudgetChange", () => {
  const stats = categoryStats(cat("a", 100000), [exp("1", "a", 80000)]);

  it("예산을 올리면 남는 금액이 늘어난다", () => {
    expect(previewBudgetChange(stats, 150000)).toEqual({ remaining: 70000, over: false });
  });

  it("이미 쓴 만큼으로 낮추면 초과가 아니다", () => {
    expect(previewBudgetChange(stats, 80000)).toEqual({ remaining: 0, over: false });
  });

  it("이미 쓴 금액보다 낮추면 초과", () => {
    expect(previewBudgetChange(stats, 50000)).toEqual({ remaining: -30000, over: true });
  });
});

describe("monthlySummary", () => {
  const data: MonthlyBudgetData = {
    month: "2026-07",
    categories: [cat("a", 100000, undefined, 0), cat("b", 50000, undefined, 1)],
    expenses: [exp("1", "a", 30000), exp("2", "a", 20000), exp("3", "b", 10000)],
  };

  it("전체 예산/사용/잔액", () => {
    const s = monthlySummary(data);
    expect(s.totalBudget).toBe(150000);
    expect(s.totalUsed).toBe(60000);
    expect(s.totalRemaining).toBe(90000);
  });

  it("전체 예산은 항목 예산 합계와 같다", () => {
    expect(monthlySummary(data).totalBudget).toBe(totalBudget(data.categories));
  });

  it("전체 사용률", () => {
    expect(monthlySummary(data).totalRate).toBeCloseTo(40);
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

describe("format & date 유틸", () => {
  it("formatCurrency 쉼표+원", () => {
    expect(formatCurrency(1234567)).toBe("1,234,567원");
    expect(formatCurrency(-20000)).toBe("-20,000원");
  });
  it("formatPercent", () => {
    expect(formatPercent(80)).toBe("80%");
    expect(formatPercent(82.53)).toBe("82.5%");
  });
  it("addMonth 연 경계 넘김", () => {
    expect(addMonth("2026-07", 1)).toBe("2026-08");
    expect(addMonth("2026-12", 1)).toBe("2027-01");
    expect(addMonth("2026-01", -1)).toBe("2025-12");
  });
});
