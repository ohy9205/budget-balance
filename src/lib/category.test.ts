import { describe, expect, it } from "vitest";
import type { BudgetCategory } from "../types";
import { DEFAULT_CATEGORY_SEED } from "../constants";
import {
  buildCategoryEditPatch,
  buildCategoryNameLookup,
  buildNewCategoryInput,
  categoryDefaultDiff,
  createCategory,
  isValidNewCategory,
  moveCategoryInList,
  moveCategoryToIndex,
  resetCategoryToSeed,
  resolveInitialCategoryId,
  sortByOrder,
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
  monthlyBudget: 50000,
  targetExpenseAmount: undefined,
  ...patch,
});

describe("sortByOrder", () => {
  it("sortOrder 오름차순 정렬", () => {
    const items = [
      fromSeed({ id: "b", sortOrder: 2 }),
      fromSeed({ id: "a", sortOrder: 0 }),
      fromSeed({ id: "c", sortOrder: 1 }),
    ];
    expect(sortByOrder(items).map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const items = [fromSeed({ id: "b", sortOrder: 1 }), fromSeed({ id: "a", sortOrder: 0 })];
    sortByOrder(items);
    expect(items.map((i) => i.id)).toEqual(["b", "a"]);
  });
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
    expect(
      buildNewCategoryInput(fields({ targetExpenseAmount: 25000 }))?.targetExpenseAmount,
    ).toBe(25000);
  });

  it("목표액이 비었거나 0이면 undefined", () => {
    expect(
      buildNewCategoryInput(fields({ targetExpenseAmount: undefined }))?.targetExpenseAmount,
    ).toBeUndefined();
    expect(
      buildNewCategoryInput(fields({ targetExpenseAmount: 0 }))?.targetExpenseAmount,
    ).toBeUndefined();
  });

  it("예산 0은 유효한 항목", () => {
    expect(buildNewCategoryInput(fields({ monthlyBudget: 0 }))?.monthlyBudget).toBe(0);
  });

  it("이름이 비면 null", () => {
    expect(buildNewCategoryInput(fields({ name: "   " }))).toBeNull();
  });

  it("월 예산 칸이 비면 null", () => {
    expect(buildNewCategoryInput(fields({ monthlyBudget: undefined }))).toBeNull();
  });
});

describe("isValidNewCategory", () => {
  it("이름+월 예산이 있으면 true", () => {
    expect(isValidNewCategory(fields())).toBe(true);
  });

  it("이름이나 월 예산 칸이 비면 false", () => {
    expect(isValidNewCategory(fields({ name: "" }))).toBe(false);
    expect(isValidNewCategory(fields({ monthlyBudget: undefined }))).toBe(false);
  });
});

describe("createCategory", () => {
  const existing = [fromSeed({ id: "a", sortOrder: 0 }), fromSeed({ id: "b", sortOrder: 3 })];

  it("정렬 순서는 기존 최대값 +1 (맨 아래)", () => {
    expect(createCategory({ name: "x", monthlyBudget: 1 }, existing, "new").sortOrder).toBe(4);
  });

  it("빈 목록이면 0부터", () => {
    expect(createCategory({ name: "x", monthlyBudget: 1 }, [], "new").sortOrder).toBe(0);
  });

  it("이름 trim·금액 정수화", () => {
    const c = createCategory(
      { name: "  간식 ", monthlyBudget: 1000.6, targetExpenseAmount: 250.4 },
      [],
      "new",
    );
    expect(c.name).toBe("간식");
    expect(c.monthlyBudget).toBe(1001);
    expect(c.targetExpenseAmount).toBe(250);
  });

  it("음수 예산은 0으로", () => {
    expect(createCategory({ name: "x", monthlyBudget: -5000 }, [], "new").monthlyBudget).toBe(0);
  });

  it("목표액이 0 이하면 undefined", () => {
    expect(
      createCategory({ name: "x", monthlyBudget: 1, targetExpenseAmount: 0 }, [], "new")
        .targetExpenseAmount,
    ).toBeUndefined();
  });

  it("직접 추가한 항목이라 seedKey가 없다", () => {
    expect(createCategory({ name: "x", monthlyBudget: 1 }, [], "new").seedKey).toBeUndefined();
  });

  it("id는 인자로 받은 값", () => {
    expect(createCategory({ name: "x", monthlyBudget: 1 }, [], "given-id").id).toBe("given-id");
  });
});

describe("moveCategoryToIndex", () => {
  const list = [
    fromSeed({ id: "a", sortOrder: 0 }),
    fromSeed({ id: "b", sortOrder: 1 }),
    fromSeed({ id: "c", sortOrder: 2 }),
  ];

  it("아래로 옮긴다", () => {
    expect(moveCategoryToIndex(list, "a", 2).map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("위로 옮긴다", () => {
    expect(moveCategoryToIndex(list, "c", 0).map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("sortOrder를 0부터 다시 부여", () => {
    expect(moveCategoryToIndex(list, "a", 2).map((c) => c.sortOrder)).toEqual([0, 1, 2]);
  });

  it("범위를 넘는 인덱스는 목록 끝으로 자른다", () => {
    expect(moveCategoryToIndex(list, "a", 99).map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(moveCategoryToIndex(list, "c", -5).map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("정렬이 어긋난 목록도 sortOrder 기준으로 옮긴다", () => {
    const messy = [
      fromSeed({ id: "later", sortOrder: 5 }),
      fromSeed({ id: "first", sortOrder: 1 }),
    ];
    expect(moveCategoryToIndex(messy, "later", 0).map((c) => c.id)).toEqual(["later", "first"]);
  });

  it("제자리 이동이면 원본 배열 그대로 반환", () => {
    expect(moveCategoryToIndex(list, "b", 1)).toBe(list);
  });

  it("범위 밖 인덱스가 제자리로 잘리면 원본 배열 그대로 반환", () => {
    expect(moveCategoryToIndex(list, "a", -3)).toBe(list);
    expect(moveCategoryToIndex(list, "c", 99)).toBe(list);
  });

  it("없는 id면 원본 배열 그대로 반환", () => {
    expect(moveCategoryToIndex(list, "없는id", 0)).toBe(list);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    moveCategoryToIndex(list, "a", 2);
    expect(list.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("moveCategoryInList", () => {
  const list = [
    fromSeed({ id: "a", sortOrder: 0 }),
    fromSeed({ id: "b", sortOrder: 1 }),
    fromSeed({ id: "c", sortOrder: 2 }),
  ];

  it("위로 이동", () => {
    expect(moveCategoryInList(list, "b", "up").map((c) => c.id)).toEqual(["b", "a", "c"]);
  });

  it("아래로 이동", () => {
    expect(moveCategoryInList(list, "b", "down").map((c) => c.id)).toEqual(["a", "c", "b"]);
  });

  it("sortOrder를 0부터 다시 부여", () => {
    expect(moveCategoryInList(list, "c", "up").map((c) => c.sortOrder)).toEqual([0, 1, 2]);
  });

  it("정렬이 어긋난 목록도 sortOrder 기준으로 옮긴다", () => {
    const messy = [
      fromSeed({ id: "later", sortOrder: 5 }),
      fromSeed({ id: "first", sortOrder: 1 }),
    ];
    expect(moveCategoryInList(messy, "later", "up").map((c) => c.id)).toEqual(["later", "first"]);
  });

  it("맨 위에서 위로 / 맨 아래에서 아래로는 원본 배열 그대로 반환", () => {
    expect(moveCategoryInList(list, "a", "up")).toBe(list);
    expect(moveCategoryInList(list, "c", "down")).toBe(list);
  });

  it("없는 id면 원본 배열 그대로 반환", () => {
    expect(moveCategoryInList(list, "없는id", "up")).toBe(list);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    moveCategoryInList(list, "b", "up");
    expect(list.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("buildCategoryEditPatch", () => {
  it("정상 입력이면 이름·월 예산·목표액 패치", () => {
    expect(buildCategoryEditPatch(fields({ name: " 식비 ", monthlyBudget: 300000 }))).toEqual({
      name: "식비",
      monthlyBudget: 300000,
      targetExpenseAmount: undefined,
    });
  });

  it("이름이 공백뿐이면 null", () => {
    expect(buildCategoryEditPatch(fields({ name: "   " }))).toBeNull();
  });

  it("예산 칸이 비어 있으면(undefined) null", () => {
    expect(buildCategoryEditPatch(fields({ monthlyBudget: undefined }))).toBeNull();
  });

  it("예산 0은 저장할 수 있다", () => {
    expect(buildCategoryEditPatch(fields({ monthlyBudget: 0 }))?.monthlyBudget).toBe(0);
  });

  it("음수 예산은 null", () => {
    expect(buildCategoryEditPatch(fields({ monthlyBudget: -1 }))).toBeNull();
  });

  it("목표액이 0 이하면 없음(undefined)", () => {
    expect(buildCategoryEditPatch(fields({ targetExpenseAmount: 0 }))?.targetExpenseAmount)
      .toBeUndefined();
  });

  it("금액은 정수로 반올림한다", () => {
    const patch = buildCategoryEditPatch(
      fields({ monthlyBudget: 1000.6, targetExpenseAmount: 99.4 }),
    );
    expect(patch?.monthlyBudget).toBe(1001);
    expect(patch?.targetExpenseAmount).toBe(99);
  });
});

describe("resetCategoryToSeed", () => {
  it("이름·월 예산·목표액을 기본값으로 되돌린다", () => {
    const edited = fromSeed({ id: "x", name: "바뀐 이름", monthlyBudget: 1, targetExpenseAmount: 2 });
    const [restored] = resetCategoryToSeed([edited], "x");
    expect(restored.name).toBe(seed.name);
    expect(restored.monthlyBudget).toBe(seed.monthlyBudget);
    expect(restored.targetExpenseAmount).toBe(seed.targetExpenseAmount);
  });

  it("정렬 순서와 id는 유지한다", () => {
    const edited = fromSeed({ id: "x", sortOrder: 9, monthlyBudget: 1 });
    const [restored] = resetCategoryToSeed([edited], "x");
    expect(restored.id).toBe("x");
    expect(restored.sortOrder).toBe(9);
  });

  it("seedKey가 없는 항목은 그대로 둔다", () => {
    const manual = fromSeed({ id: "x", seedKey: undefined, name: "직접 추가", monthlyBudget: 1 });
    expect(resetCategoryToSeed([manual], "x")[0]).toEqual(manual);
  });

  it("다른 항목은 건드리지 않는다", () => {
    const other = fromSeed({ id: "other", name: "그대로", monthlyBudget: 1 });
    const target = fromSeed({ id: "x", monthlyBudget: 1 });
    const result = resetCategoryToSeed([other, target], "x");
    expect(result[0]).toEqual(other);
    expect(result[1].monthlyBudget).toBe(seed.monthlyBudget);
  });
});
