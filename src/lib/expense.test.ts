import { describe, expect, it } from "vitest";
import type { Expense } from "../types";
import { sortExpensesByRecency } from "./expense";

const exp = (id: string, createdAt: string, date = "2026-07-10"): Expense => ({
  id,
  categoryId: "a",
  amount: 1000,
  paymentMethod: "credit",
  date,
  createdAt,
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

  it("createdAt이 같으면 date 내림차순", () => {
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
