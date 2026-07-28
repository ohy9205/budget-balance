import { describe, expect, it } from "vitest";
import type { BudgetCategory } from "../types";
import { DEFAULT_CATEGORY_SEED } from "../constants";
import {
  buildCategoryEditPatch,
  buildCategoryNameLookup,
  buildNewCategoryInput,
  createCategory,
  moveCategoryToIndex,
  resolveInitialCategoryId,
  sortByOrder,
  type NewCategoryFields,
} from "./category";

/** 1회 사용 목표 금액이 있는 기본 항목 — 시드 내용이 바뀌어도 테스트가 따라간다 */
const seed = DEFAULT_CATEGORY_SEED.find((s) => s.targetAmountPerUse)!;

const fromSeed = (patch: Partial<BudgetCategory> = {}): BudgetCategory => ({
  id: "c1",
  name: seed.name,
  budget: seed.budget,
  targetAmountPerUse: seed.targetAmountPerUse,
  sortOrder: seed.sortOrder,
  seedKey: seed.key,
  ...patch,
});

const fields = (patch: Partial<NewCategoryFields> = {}): NewCategoryFields => ({
  name: "새 항목",
  budget: 50000,
  targetAmountPerUse: undefined,
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
      icon: undefined,
      budget: 50000,
      targetAmountPerUse: undefined,
    });
  });

  it("아이콘을 넣으면 함께 담는다", () => {
    expect(buildNewCategoryInput(fields({ icon: "coffee" }))?.icon).toBe("coffee");
  });

  it("목표액을 넣으면 함께 담는다", () => {
    expect(buildNewCategoryInput(fields({ targetAmountPerUse: 25000 }))?.targetAmountPerUse).toBe(
      25000,
    );
  });

  it("목표액이 비었거나 0이면 undefined", () => {
    expect(
      buildNewCategoryInput(fields({ targetAmountPerUse: undefined }))?.targetAmountPerUse,
    ).toBeUndefined();
    expect(
      buildNewCategoryInput(fields({ targetAmountPerUse: 0 }))?.targetAmountPerUse,
    ).toBeUndefined();
  });

  it("예산은 0보다 커야 한다", () => {
    expect(buildNewCategoryInput(fields({ budget: 0 }))).toBeNull();
    expect(buildNewCategoryInput(fields({ budget: -1 }))).toBeNull();
    expect(buildNewCategoryInput(fields({ budget: 1 }))?.budget).toBe(1);
  });

  it("이름이 비면 null", () => {
    expect(buildNewCategoryInput(fields({ name: "   " }))).toBeNull();
  });

  it("월 예산 칸이 비면 null", () => {
    expect(buildNewCategoryInput(fields({ budget: undefined }))).toBeNull();
  });
});

describe("createCategory", () => {
  const existing = [fromSeed({ id: "a", sortOrder: 0 }), fromSeed({ id: "b", sortOrder: 3 })];

  it("정렬 순서는 기존 최대값 +1 (맨 아래)", () => {
    expect(createCategory({ name: "x", budget: 1 }, existing, "new").sortOrder).toBe(4);
  });

  it("빈 목록이면 0부터", () => {
    expect(createCategory({ name: "x", budget: 1 }, [], "new").sortOrder).toBe(0);
  });

  it("이름 trim·금액 정수화", () => {
    const c = createCategory(
      { name: "  간식 ", budget: 1000.6, targetAmountPerUse: 250.4 },
      [],
      "new",
    );
    expect(c.name).toBe("간식");
    expect(c.budget).toBe(1001);
    expect(c.targetAmountPerUse).toBe(250);
  });

  it("음수 예산은 0으로", () => {
    expect(createCategory({ name: "x", budget: -5000 }, [], "new").budget).toBe(0);
  });

  it("아이콘은 그대로 담는다", () => {
    expect(createCategory({ name: "x", budget: 1, icon: "coffee" }, [], "new").icon).toBe("coffee");
  });

  it("목표액이 0 이하면 undefined", () => {
    expect(
      createCategory({ name: "x", budget: 1, targetAmountPerUse: 0 }, [], "new").targetAmountPerUse,
    ).toBeUndefined();
  });

  it("직접 추가한 항목이라 seedKey가 없다", () => {
    expect(createCategory({ name: "x", budget: 1 }, [], "new").seedKey).toBeUndefined();
  });

  it("id는 인자로 받은 값", () => {
    expect(createCategory({ name: "x", budget: 1 }, [], "given-id").id).toBe("given-id");
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

describe("buildCategoryEditPatch", () => {
  it("정상 입력이면 이름·아이콘·월 예산·목표액 패치", () => {
    expect(buildCategoryEditPatch(fields({ name: " 식비 ", budget: 300000 }))).toEqual({
      name: "식비",
      icon: undefined,
      budget: 300000,
      targetAmountPerUse: undefined,
    });
  });

  it("이름이 공백뿐이면 null", () => {
    expect(buildCategoryEditPatch(fields({ name: "   " }))).toBeNull();
  });

  it("예산 칸이 비어 있으면(undefined) null", () => {
    expect(buildCategoryEditPatch(fields({ budget: undefined }))).toBeNull();
  });

  it("예산 0 이하는 null", () => {
    expect(buildCategoryEditPatch(fields({ budget: 0 }))).toBeNull();
    expect(buildCategoryEditPatch(fields({ budget: -1 }))).toBeNull();
  });

  it("목표액이 0 이하면 없음(undefined)", () => {
    expect(buildCategoryEditPatch(fields({ targetAmountPerUse: 0 }))?.targetAmountPerUse)
      .toBeUndefined();
  });

  it("금액은 정수로 반올림한다", () => {
    const patch = buildCategoryEditPatch(fields({ budget: 1000.6, targetAmountPerUse: 99.4 }));
    expect(patch?.budget).toBe(1001);
    expect(patch?.targetAmountPerUse).toBe(99);
  });
});
