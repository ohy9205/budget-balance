import { describe, expect, it } from "vitest";
import type { MonthlyBudgetData } from "../types";
import { findPreviousMonthWithData } from "./month";

const month = (key: string): MonthlyBudgetData => ({ month: key, categories: [], expenses: [] });

const store = (...keys: string[]): Record<string, MonthlyBudgetData> =>
  Object.fromEntries(keys.map((k) => [k, month(k)]));

describe("findPreviousMonthWithData", () => {
  it("바로 앞 월이 없으면 그보다 앞선 가장 최근 월", () => {
    expect(findPreviousMonthWithData(store("2026-03", "2026-05"), "2026-07")).toBe("2026-05");
  });

  it("연도를 넘어가도 문자열 순서로 찾는다", () => {
    expect(findPreviousMonthWithData(store("2025-12", "2026-02"), "2026-01")).toBe("2025-12");
  });

  it("현재 월과 이후 월은 후보가 아니다", () => {
    expect(findPreviousMonthWithData(store("2026-07", "2026-09"), "2026-07")).toBeNull();
  });

  it("앞선 월이 없으면 null", () => {
    expect(findPreviousMonthWithData(store("2026-08"), "2026-07")).toBeNull();
  });

  it("빈 저장소면 null", () => {
    expect(findPreviousMonthWithData({}, "2026-07")).toBeNull();
  });
});
