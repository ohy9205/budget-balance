import { useRef, useState } from "react";
import { DragDropProvider, KeyboardSensor, PointerSensor } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import { Button, useHaptic } from "@toss/tds-mobile";
import type { BudgetCategory } from "../types";
import type { CategoryStats } from "../lib/calculations";
import { useBudget } from "../context/BudgetContext";
import { CategoryAddSheet } from "./CategoryAddSheet";
import { CategoryCard, type CardMenuState } from "./CategoryCard";
import { CategoryEditSheet } from "./CategoryEditSheet";
import { ConfirmDialog } from "./ConfirmDialog";

/** 롱프레스 판정 시간(ms) */
const LONG_PRESS_MS = 500;
/** 누른 채 이만큼 넘게 움직이면 롱프레스 취소 → 스크롤 */
const LONG_PRESS_TOLERANCE_PX = 5;
/** 메뉴가 뜬 뒤 이만큼 넘게 끌면 정렬 모드 */
const SORT_INTENT_PX = 8;

type MenuState = { categoryId: string; committed: boolean } | null;

interface CategoryListProps {
  stats: CategoryStats[];
  onAddExpense: (categoryId: string) => void;
}

/**
 * 예산 항목 목록 + 롱프레스 메뉴·편집 시트·삭제 확인.
 * 탭 / 스크롤 / 롱프레스는 `PointerSensor`의 활성화 제약 하나로 갈린다.
 */
export function CategoryList({ stats, onAddExpense }: CategoryListProps) {
  const { addCategory, updateCategory, deleteCategory, reorderCategory } = useBudget();
  const haptic = useHaptic();

  const [menu, setMenu] = useState<MenuState>(null);
  const [editing, setEditing] = useState<BudgetCategory | null>(null);
  const [deleting, setDeleting] = useState<BudgetCategory | null>(null);
  const [adding, setAdding] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  /** 드래그 뒤 따라오는 유령 click을 무시하기 위한 표시 */
  const suppressClickRef = useRef(false);
  /** 이번 제스처에 정렬하려는 움직임이 있었는지 */
  const draggedRef = useRef(false);

  const menuStateOf = (categoryId: string): CardMenuState => {
    if (menu?.categoryId !== categoryId) return "closed";
    return menu.committed ? "open" : "preview";
  };

  return (
    <>
      <DragDropProvider
        sensors={[
          PointerSensor.configure({
            /* 기본값은 마우스에서 5px 이동만으로 드래그가 시작된다 — Delay만 남겨 통일한다 */
            activationConstraints: [
              new PointerActivationConstraints.Delay({
                value: LONG_PRESS_MS,
                tolerance: LONG_PRESS_TOLERANCE_PX,
              }),
            ],
            /* 기본값은 버튼 위에서 시작한 드래그를 막는데, 카드 자체가 ListRow 버튼이라
               그대로 두면 활성화가 아예 안 된다. 카드 안에 다른 인터랙티브 요소는 없다. */
            preventActivation: () => false,
          }),
          KeyboardSensor,
        ]}
        modifiers={[RestrictToElement.configure({ element: () => listRef.current })]}
        onDragStart={({ operation }) => {
          const { source } = operation;
          if (!source) return;
          draggedRef.current = false;
          suppressClickRef.current = true;
          setMenu({ categoryId: String(source.id), committed: false });
          // 토스 앱 밖에는 브리지가 없다 — 여기서 터지면 드래그까지 죽으므로 삼킨다
          try {
            haptic.generate({ type: "tickMedium" });
          } catch {
            /* noop */
          }
        }}
        onDragMove={({ operation }) => {
          if (draggedRef.current) return;
          const { x, y } = operation.transform;
          if (Math.hypot(x, y) <= SORT_INTENT_PX) return;
          // 끌기 시작 = 정렬 의도 → 메뉴를 접는다
          draggedRef.current = true;
          setMenu(null);
        }}
        onDragEnd={({ operation, canceled }) => {
          const { source } = operation;
          // 뒤따라오는 click을 한 틱 흘려보낸다
          setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);

          if (canceled || !source) {
            setMenu(null);
            return;
          }

          if (!draggedRef.current) {
            // 안 움직이고 뗐다 → 메뉴 확정
            setMenu((m) => (m ? { ...m, committed: true } : m));
            return;
          }

          setMenu(null);
          // index는 드래그 중 낙관적으로 갱신되므로 뗀 시점 값이 목적지다
          if (isSortable(source) && source.index !== source.initialIndex) {
            reorderCategory(String(source.id), source.index);
          }
        }}
      >
        <div className="list-rows" ref={listRef}>
          {stats.map((s, index) => (
            <CategoryCard
              key={s.category.id}
              stats={s}
              index={index}
              menu={menuStateOf(s.category.id)}
              onAddExpense={onAddExpense}
              onRequestEdit={() => {
                setMenu(null);
                setEditing(s.category);
              }}
              onRequestDelete={() => {
                setMenu(null);
                setDeleting(s.category);
              }}
              isClickSuppressed={() => suppressClickRef.current}
            />
          ))}
        </div>
      </DragDropProvider>

      <div className="cat-add">
        <Button
          variant="fill"
          color='light'
          onClick={() => setAdding(true)}
        >
          + 항목 추가
        </Button>
      </div>

      {/* 손을 뗀 뒤에만 깐다 — 누르는 중에 깔면 이어지는 드래그를 방해한다 */}
      {menu?.committed && (
        <div className="cat-menu-scrim" onClick={() => setMenu(null)} aria-hidden="true" />
      )}

      {adding && (
        <CategoryAddSheet onSubmit={addCategory} onClose={() => setAdding(false)} />
      )}

      {editing && (
        <CategoryEditSheet
          category={editing}
          onSubmit={(patch) => updateCategory(editing.id, patch)}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="항목 삭제"
          danger
          message={`'${deleting.name}' 항목과 이 달의 해당 지출 내역이 모두 삭제됩니다. 계속할까요?`}
          confirmLabel="삭제"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteCategory(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
