import { describe, expect, it } from "vitest";
import type { BudgetCategory, Expense, MonthlyBudgetData } from "../types";
import { DEFAULT_CATEGORY_SEED } from "../constants";
import {
  copyBudgetFrom,
  createSeededMonth,
  findPreviousMonthWithData,
  hasAnyMonthData,
  removeMonth,
} from "./month";

const month = (key: string): MonthlyBudgetData => ({ month: key, categories: [], expenses: [] });

const store = (...keys: string[]): Record<string, MonthlyBudgetData> =>
  Object.fromEntries(keys.map((k) => [k, month(k)]));

/** 결정론적 id 발급기 — 실제 `newId`(난수) 대신 넣는다 */
const idSeq = () => {
  let n = 0;
  return () => `id${++n}`;
};

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

describe("hasAnyMonthData", () => {
  it("월이 하나도 없으면 false", () => {
    expect(hasAnyMonthData({})).toBe(false);
  });

  it("월이 하나라도 있으면 true", () => {
    expect(hasAnyMonthData(store("2026-07"))).toBe(true);
  });
});

describe("removeMonth", () => {
  it("해당 월만 지운다", () => {
    const months = store("2026-06", "2026-07");
    expect(Object.keys(removeMonth(months, "2026-07"))).toEqual(["2026-06"]);
  });

  it("없는 월이면 그대로", () => {
    const months = store("2026-06");
    expect(Object.keys(removeMonth(months, "2026-07"))).toEqual(["2026-06"]);
  });

  it("원본 맵을 바꾸지 않는다", () => {
    const months = store("2026-06", "2026-07");
    removeMonth(months, "2026-07");
    expect(Object.keys(months).sort()).toEqual(["2026-06", "2026-07"]);
  });
});

describe("createSeededMonth", () => {
  const created = createSeededMonth("2026-07", idSeq());

  it("기본 항목 전체를 시드 값 그대로 만든다", () => {
    expect(created.categories).toHaveLength(DEFAULT_CATEGORY_SEED.length);
    expect(created.categories.map((c) => c.name)).toEqual(
      DEFAULT_CATEGORY_SEED.map((s) => s.name),
    );
    expect(created.categories.map((c) => c.budget)).toEqual(
      DEFAULT_CATEGORY_SEED.map((s) => s.budget),
    );
  });

  it("seedKey로 시드 key를 붙인다 (나중에 기본값으로 되돌릴 수 있게)", () => {
    expect(created.categories.map((c) => c.seedKey)).toEqual(
      DEFAULT_CATEGORY_SEED.map((s) => s.key),
    );
  });

  it("시드의 key 필드 자체는 항목에 남지 않는다", () => {
    expect(created.categories[0]).not.toHaveProperty("key");
  });

  it("월 키를 그대로 쓰고 지출은 비어 있다", () => {
    expect(created.month).toBe("2026-07");
    expect(created.expenses).toEqual([]);
  });

  it("항목마다 다른 id를 발급한다", () => {
    const ids = createSeededMonth("2026-07").categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("copyBudgetFrom", () => {
  const cat = (patch: Partial<BudgetCategory>): BudgetCategory => ({
    id: "src-id",
    name: "장보기",
    budget: 100000,
    sortOrder: 0,
    ...patch,
  });

  const expense: Expense = {
    id: "e1",
    categoryId: "src-a",
    amount: 5000,
    spentAt: "2026-06-10",
    createdAt: "2026-06-10T00:00:00.000Z",
  };

  const source: MonthlyBudgetData = {
    month: "2026-06",
    categories: [
      cat({ id: "src-b", name: "교통비", budget: 80000, sortOrder: 1 }),
      cat({ id: "src-a", name: "장보기", sortOrder: 0, seedKey: "groceries" }),
    ],
    expenses: [expense],
  };

  it("대상 월 키로 만든다", () => {
    expect(copyBudgetFrom(source, "2026-07", idSeq()).month).toBe("2026-07");
  });

  it("지출은 복사하지 않는다", () => {
    expect(copyBudgetFrom(source, "2026-07", idSeq()).expenses).toEqual([]);
  });

  it("항목 id를 새로 발급한다 (월끼리 id를 공유하지 않는다)", () => {
    const copied = copyBudgetFrom(source, "2026-07", idSeq());
    expect(copied.categories.map((c) => c.id)).toEqual(["id1", "id2"]);
    const sourceIds = source.categories.map((c) => c.id);
    expect(copied.categories.every((c) => !sourceIds.includes(c.id))).toBe(true);
  });

  it("sortOrder 오름차순으로 담는다", () => {
    expect(copyBudgetFrom(source, "2026-07", idSeq()).categories.map((c) => c.name)).toEqual([
      "장보기",
      "교통비",
    ]);
  });

  it("이름·아이콘·금액·목표액·정렬 순서는 그대로 유지한다", () => {
    const withTarget: MonthlyBudgetData = {
      ...source,
      categories: [
        cat({ icon: "cart", budget: 270000, targetAmountPerUse: 25000, sortOrder: 3 }),
      ],
    };
    const [copied] = copyBudgetFrom(withTarget, "2026-07", idSeq()).categories;
    expect(copied.name).toBe("장보기");
    expect(copied.icon).toBe("cart");
    expect(copied.budget).toBe(270000);
    expect(copied.targetAmountPerUse).toBe(25000);
    expect(copied.sortOrder).toBe(3);
  });

  it("seedKey는 월을 넘어가도 유지한다", () => {
    const copied = copyBudgetFrom(source, "2026-07", idSeq()).categories;
    expect(copied.find((c) => c.name === "장보기")?.seedKey).toBe("groceries");
    expect(copied.find((c) => c.name === "교통비")?.seedKey).toBeUndefined();
  });

  it("원본 월을 바꾸지 않는다", () => {
    copyBudgetFrom(source, "2026-07", idSeq());
    expect(source.month).toBe("2026-06");
    expect(source.categories.map((c) => c.id)).toEqual(["src-b", "src-a"]);
    expect(source.expenses).toHaveLength(1);
  });
});
