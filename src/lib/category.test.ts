import { describe, expect, it } from "vitest";
import type { BudgetCategory } from "../types";
import { DEFAULT_CATEGORY_SEED } from "../constants";
import {
  buildCategoryNameLookup,
  buildNewCategoryInput,
  categoryDefaultDiff,
  isValidNewCategory,
  resolveInitialCategoryId,
  type NewCategoryFields,
} from "./category";
import { formatCurrency } from "./format";

/** 목표 1회 지출액이 있는 기본 항목 — 시드 내용이 바뀌어도 테스트가 따라간다 */
const seed = DEFAULT_CATEGORY_SEED.find((s) => s.targetExpenseAmount)!;

const fromSeed = (patch: Partial<BudgetCategory> = {}): BudgetCategory => ({
  id: "c1",
  name: seed.name,
  monthlyBudget: seed.monthlyBudget,
  targetExpenseAmount: seed.targetExpenseAmount,
  sortOrder: seed.sortOrder,
  seedKey: seed.key,
  ...patch,
});

const fields = (patch: Partial<NewCategoryFields> = {}): NewCategoryFields => ({
  name: "새 항목",
  monthlyBudget: "50000",
  targetExpenseAmount: "",
  ...patch,
});

describe("categoryDefaultDiff", () => {
  it("기본값과 같으면 빈 배열", () => {
    expect(categoryDefaultDiff(fromSeed())).toEqual([]);
  });

  it("seedKey가 없는(직접 추가한) 항목은 빈 배열", () => {
    expect(categoryDefaultDiff(fromSeed({ seedKey: undefined, monthlyBudget: 1 }))).toEqual([]);
  });

  it("이름만 달라지면 되돌아갈 이름 하나", () => {
    expect(categoryDefaultDiff(fromSeed({ name: "내가 바꾼 이름" }))).toEqual([
      `이름 ${seed.name}`,
    ]);
  });

  it("월 예산이 달라지면 기본 금액을 통화 형식으로", () => {
    expect(categoryDefaultDiff(fromSeed({ monthlyBudget: 1 }))).toEqual([
      `월 예산 ${formatCurrency(seed.monthlyBudget)}`,
    ]);
  });

  it("목표액을 지우면 기본 목표액으로 되돌아감을 알린다", () => {
    expect(categoryDefaultDiff(fromSeed({ targetExpenseAmount: undefined }))).toEqual([
      `목표 1회 지출액 ${formatCurrency(seed.targetExpenseAmount!)}`,
    ]);
  });

  it("기본값에 목표액이 없는 항목에 목표액을 넣으면 '없음'으로 안내", () => {
    const plain = DEFAULT_CATEGORY_SEED.find((s) => !s.targetExpenseAmount)!;
    const c = fromSeed({
      name: plain.name,
      monthlyBudget: plain.monthlyBudget,
      seedKey: plain.key,
      targetExpenseAmount: 10000,
    });
    expect(categoryDefaultDiff(c)).toEqual(["목표 1회 지출액 없음"]);
  });

  it("여러 항목이 달라지면 이름·월 예산·목표액 순으로 모두 나열", () => {
    const diff = categoryDefaultDiff(
      fromSeed({ name: "x", monthlyBudget: 1, targetExpenseAmount: 2 }),
    );
    expect(diff).toHaveLength(3);
    expect(diff[0]).toContain("이름");
    expect(diff[1]).toContain("월 예산");
    expect(diff[2]).toContain("목표 1회 지출액");
  });
});

describe("buildCategoryNameLookup", () => {
  const lookup = buildCategoryNameLookup([
    fromSeed({ id: "a", name: "장보기" }),
    fromSeed({ id: "b", name: "교통비" }),
  ]);

  it("id로 이름을 찾는다", () => {
    expect(lookup("a")).toBe("장보기");
    expect(lookup("b")).toBe("교통비");
  });

  it("없는 id는 '(삭제된 항목)'", () => {
    expect(lookup("없는id")).toBe("(삭제된 항목)");
  });
});

describe("resolveInitialCategoryId", () => {
  const list = [fromSeed({ id: "a" }), fromSeed({ id: "b" })];

  it("원하는 항목이 목록에 있으면 그것", () => {
    expect(resolveInitialCategoryId(list, "b")).toBe("b");
  });

  it("원하는 항목이 없으면 첫 항목", () => {
    expect(resolveInitialCategoryId(list, "사라진id")).toBe("a");
  });

  it("원하는 항목을 지정하지 않으면 첫 항목", () => {
    expect(resolveInitialCategoryId(list)).toBe("a");
  });

  it("목록이 비면 빈 문자열", () => {
    expect(resolveInitialCategoryId([], "a")).toBe("");
  });
});

describe("buildNewCategoryInput", () => {
  it("이름은 trim하고 금액은 정수로", () => {
    expect(buildNewCategoryInput(fields({ name: "  간식  " }))).toEqual({
      name: "간식",
      monthlyBudget: 50000,
      targetExpenseAmount: undefined,
    });
  });

  it("목표액을 넣으면 함께 담는다", () => {
    expect(buildNewCategoryInput(fields({ targetExpenseAmount: "25000" }))?.targetExpenseAmount).toBe(
      25000,
    );
  });

  it("목표액이 비었거나 0이면 undefined", () => {
    expect(buildNewCategoryInput(fields({ targetExpenseAmount: "" }))?.targetExpenseAmount).toBeUndefined();
    expect(buildNewCategoryInput(fields({ targetExpenseAmount: "0" }))?.targetExpenseAmount).toBeUndefined();
  });

  it("예산 0은 유효한 항목", () => {
    expect(buildNewCategoryInput(fields({ monthlyBudget: "0" }))?.monthlyBudget).toBe(0);
  });

  it("이름이 비면 null", () => {
    expect(buildNewCategoryInput(fields({ name: "   " }))).toBeNull();
  });

  it("월 예산이 비면 null", () => {
    expect(buildNewCategoryInput(fields({ monthlyBudget: "" }))).toBeNull();
  });
});

describe("isValidNewCategory", () => {
  it("이름+월 예산이 있으면 true", () => {
    expect(isValidNewCategory(fields())).toBe(true);
  });

  it("이름이나 월 예산이 비면 false", () => {
    expect(isValidNewCategory(fields({ name: "" }))).toBe(false);
    expect(isValidNewCategory(fields({ monthlyBudget: "" }))).toBe(false);
  });
});
