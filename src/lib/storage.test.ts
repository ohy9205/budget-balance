import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORY_SEED } from "../constants";
import { sanitizeMonth } from "./storage";

/**
 * `sanitizeMonth`는 저장된(또는 손상된) 값을 정규화하는 방어 로직이다 — 절대 throw하지 않고
 * 쓸 수 없는 레코드는 조용히 버린다. 여기서 버려지는 것이 곧 데이터 손실이므로 규칙을 고정해 둔다.
 */

const seed = DEFAULT_CATEGORY_SEED[0];

const raw = (categories: unknown[], expenses: unknown[] = []) => ({
  month: "2026-07",
  categories,
  expenses,
});

/** 기본 항목과 이름이 겹치지 않는 항목 (겹치면 seedKey가 이름으로 복원된다) */
const validCategory = { id: "c1", name: "커피", monthlyBudget: 100000, sortOrder: 0 };
const validExpense = {
  id: "e1",
  categoryId: "c1",
  amount: 5000,
  paymentMethod: "credit",
  date: "2026-07-10",
  createdAt: "2026-07-10T00:00:00.000Z",
};

describe("sanitizeMonth — 월 자체", () => {
  it("정상 데이터는 그대로 통과", () => {
    const m = sanitizeMonth(raw([validCategory], [validExpense]))!;
    expect(m.month).toBe("2026-07");
    expect(m.categories).toHaveLength(1);
    expect(m.expenses).toHaveLength(1);
  });

  it("month 필드가 없으면 저장소 키를 쓴다", () => {
    expect(sanitizeMonth({ categories: [] }, "2026-03")?.month).toBe("2026-03");
  });

  it("월 키 형식이 아니면 null", () => {
    expect(sanitizeMonth({ month: "2026-13", categories: [] })).toBeNull();
    expect(sanitizeMonth({ month: "202607", categories: [] })).toBeNull();
    expect(sanitizeMonth({ categories: [] })).toBeNull();
  });

  it("객체가 아니면 null", () => {
    expect(sanitizeMonth(null)).toBeNull();
    expect(sanitizeMonth("2026-07")).toBeNull();
    expect(sanitizeMonth(42)).toBeNull();
  });

  it("categories·expenses가 배열이 아니면 빈 배열로", () => {
    const m = sanitizeMonth({ month: "2026-07", categories: "nope", expenses: 1 })!;
    expect(m.categories).toEqual([]);
    expect(m.expenses).toEqual([]);
  });
});

describe("sanitizeMonth — 항목 정규화", () => {
  const firstCategory = (patch: Record<string, unknown>) =>
    sanitizeMonth(raw([{ ...validCategory, ...patch }]))!.categories[0];

  it("이름이 없으면 그 항목을 버린다", () => {
    expect(sanitizeMonth(raw([{ ...validCategory, name: "" }]))!.categories).toEqual([]);
    expect(sanitizeMonth(raw([{ monthlyBudget: 1 }]))!.categories).toEqual([]);
    expect(sanitizeMonth(raw([null, 7]))!.categories).toEqual([]);
  });

  it("예산이 없거나 숫자가 아니면 0", () => {
    expect(firstCategory({ monthlyBudget: undefined }).monthlyBudget).toBe(0);
    expect(firstCategory({ monthlyBudget: "10000" }).monthlyBudget).toBe(0);
    expect(firstCategory({ monthlyBudget: Infinity }).monthlyBudget).toBe(0);
  });

  it("예산은 음수 방지·정수화", () => {
    expect(firstCategory({ monthlyBudget: -5000 }).monthlyBudget).toBe(0);
    expect(firstCategory({ monthlyBudget: 1000.6 }).monthlyBudget).toBe(1001);
  });

  it("목표액은 0 이하면 undefined, 있으면 정수화", () => {
    expect(firstCategory({ targetExpenseAmount: 0 }).targetExpenseAmount).toBeUndefined();
    expect(firstCategory({ targetExpenseAmount: -1 }).targetExpenseAmount).toBeUndefined();
    expect(firstCategory({ targetExpenseAmount: 250.4 }).targetExpenseAmount).toBe(250);
  });

  it("id가 없으면 새로 발급한다", () => {
    expect(firstCategory({ id: undefined }).id).toMatch(/.+/);
  });

  it("sortOrder가 없으면 배열 순서를 쓴다", () => {
    const m = sanitizeMonth(
      raw([
        { name: "a", monthlyBudget: 1 },
        { name: "b", monthlyBudget: 1 },
      ]),
    )!;
    expect(m.categories.map((c) => c.sortOrder)).toEqual([0, 1]);
  });
});

describe("sanitizeMonth — seedKey 복원", () => {
  it("모르는 시드 키는 버린다", () => {
    expect(sanitizeMonth(raw([{ ...validCategory, seedKey: "없는키" }]))!.categories[0].seedKey)
      .toBeUndefined();
  });

  it("시드 키가 있으면 유지한다", () => {
    const m = sanitizeMonth(raw([{ ...validCategory, seedKey: seed.key }]))!;
    expect(m.categories[0].seedKey).toBe(seed.key);
  });

  it("키가 없는 예전 데이터는 이름으로 기본 항목을 찾아 붙인다", () => {
    const m = sanitizeMonth(raw([{ id: "c1", name: seed.name, monthlyBudget: 1, sortOrder: 0 }]))!;
    expect(m.categories[0].seedKey).toBe(seed.key);
  });

  it("기본 항목 이름이 아니면 붙이지 않는다", () => {
    expect(sanitizeMonth(raw([validCategory]))!.categories[0].seedKey).toBeUndefined();
  });

  it("직접 추가한 항목도 이름이 기본 항목과 같으면 seedKey가 붙는다 (이름 기반 복원의 부작용)", () => {
    const m = sanitizeMonth(raw([{ id: "c1", name: seed.name, monthlyBudget: 999, sortOrder: 0 }]))!;
    expect(m.categories[0].seedKey).toBe(seed.key);
  });
});

describe("sanitizeMonth — 지출 정규화", () => {
  const firstExpense = (patch: Record<string, unknown>) =>
    sanitizeMonth(raw([validCategory], [{ ...validExpense, ...patch }]))!.expenses[0];

  const dropped = (patch: Record<string, unknown>) =>
    sanitizeMonth(raw([validCategory], [{ ...validExpense, ...patch }]))!.expenses;

  it("같은 월에 없는 항목을 가리키는 지출은 버린다 (고아 지출 방지)", () => {
    expect(dropped({ categoryId: "사라진항목" })).toEqual([]);
  });

  it("버려진 항목의 지출도 함께 버려진다", () => {
    const m = sanitizeMonth(raw([{ ...validCategory, name: "" }], [validExpense]))!;
    expect(m.expenses).toEqual([]);
  });

  it("id·날짜가 없으면 버린다", () => {
    expect(dropped({ id: undefined })).toEqual([]);
    expect(dropped({ date: undefined })).toEqual([]);
  });

  it("금액이 0 이하거나 숫자가 아니면 버린다", () => {
    expect(dropped({ amount: 0 })).toEqual([]);
    expect(dropped({ amount: -100 })).toEqual([]);
    expect(dropped({ amount: "5000" })).toEqual([]);
  });

  it("결제수단이 credit/debit이 아니면 버린다", () => {
    expect(dropped({ paymentMethod: "cash" })).toEqual([]);
    expect(dropped({ paymentMethod: undefined })).toEqual([]);
  });

  it("금액은 정수화한다", () => {
    expect(firstExpense({ amount: 5000.6 }).amount).toBe(5001);
  });

  it("빈 메모는 저장하지 않는다", () => {
    expect(firstExpense({ memo: "" }).memo).toBeUndefined();
    expect(firstExpense({ memo: 123 }).memo).toBeUndefined();
    expect(firstExpense({ memo: "점심" }).memo).toBe("점심");
  });

  it("createdAt이 없으면 채워 넣는다 (최근순 정렬이 깨지지 않게)", () => {
    expect(firstExpense({ createdAt: undefined }).createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
