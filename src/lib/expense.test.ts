import { describe, expect, it } from "vitest";
import type { Expense, NewExpenseInput } from "../types";
import { applyExpenseInput, createExpense, sortExpensesByRecency } from "./expense";

const exp = (id: string, createdAt: string, spentAt = "2026-07-10"): Expense => ({
  id,
  categoryId: "a",
  amount: 1000,
  spentAt,
  createdAt,
});

const input = (patch: Partial<NewExpenseInput> = {}): NewExpenseInput => ({
  categoryId: "cat",
  amount: 25000,
  spentAt: "2026-07-10",
  ...patch,
});

describe("createExpense", () => {
  it("입력값을 그대로 담고 id·createdAt은 인자로 받은 값", () => {
    const e = createExpense(input(), "given-id", "2026-07-10T09:00:00.000Z");
    expect(e).toEqual({
      id: "given-id",
      categoryId: "cat",
      amount: 25000,
      spentAt: "2026-07-10",
      memo: undefined,
      createdAt: "2026-07-10T09:00:00.000Z",
    });
  });

  it("금액을 정수 원으로 맞춘다", () => {
    expect(createExpense(input({ amount: 1000.6 }), "i", "t").amount).toBe(1001);
  });

  it("메모는 trim하고, 공백만이면 저장하지 않는다", () => {
    expect(createExpense(input({ memo: "  점심  " }), "i", "t").memo).toBe("점심");
    expect(createExpense(input({ memo: "   " }), "i", "t").memo).toBeUndefined();
    expect(createExpense(input({ memo: undefined }), "i", "t").memo).toBeUndefined();
  });
});

describe("applyExpenseInput", () => {
  const original: Expense = {
    id: "keep-id",
    categoryId: "old",
    amount: 1000,
    spentAt: "2026-07-01",
    memo: "이전 메모",
    createdAt: "2026-07-01T00:00:00.000Z",
  };

  it("id·createdAt은 원본을 유지한다", () => {
    const updated = applyExpenseInput(original, input());
    expect(updated.id).toBe("keep-id");
    expect(updated.createdAt).toBe("2026-07-01T00:00:00.000Z");
  });

  it("항목·금액·날짜를 새 값으로 바꾼다", () => {
    const updated = applyExpenseInput(original, input());
    expect(updated.categoryId).toBe("cat");
    expect(updated.amount).toBe(25000);
    expect(updated.spentAt).toBe("2026-07-10");
  });

  it("메모를 비우면 지워진다", () => {
    expect(applyExpenseInput(original, input({ memo: "  " })).memo).toBeUndefined();
  });

  it("원본 객체를 바꾸지 않는다", () => {
    applyExpenseInput(original, input());
    expect(original.categoryId).toBe("old");
  });
});

describe("sortExpensesByRecency", () => {
  it("createdAt 내림차순", () => {
    const list = [
      exp("old", "2026-07-01T00:00:00.000Z"),
      exp("new", "2026-07-20T00:00:00.000Z"),
      exp("mid", "2026-07-10T00:00:00.000Z"),
    ];
    expect(sortExpensesByRecency(list).map((e) => e.id)).toEqual(["new", "mid", "old"]);
  });

  it("createdAt이 같으면 spentAt 내림차순", () => {
    const same = "2026-07-10T00:00:00.000Z";
    const list = [exp("d1", same, "2026-07-01"), exp("d2", same, "2026-07-09")];
    expect(sortExpensesByRecency(list).map((e) => e.id)).toEqual(["d2", "d1"]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const list = [exp("a", "2026-07-01T00:00:00.000Z"), exp("b", "2026-07-20T00:00:00.000Z")];
    sortExpensesByRecency(list);
    expect(list.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("빈 배열", () => {
    expect(sortExpensesByRecency([])).toEqual([]);
  });
});
