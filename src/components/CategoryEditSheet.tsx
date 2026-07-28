import { useRef, useState } from "react";
import { BottomSheet, TextField } from "@toss/tds-mobile";
import type { BudgetCategory, CategoryPatch } from "../types";
import { buildCategoryEditPatch } from "../lib/category";
import { useAutoFocus } from "../hooks/useAutoFocus";
import { useDeferredClose } from "../hooks/useDeferredClose";
import { useSheetMaxHeight } from "../hooks/useSheetMaxHeight";
import { AmountField } from "./AmountField";

interface CategoryEditSheetProps {
  category: BudgetCategory;
  onSubmit: (patch: CategoryPatch) => void;
  onClose: () => void;
}

/**
 * 항목 편집 하단 시트. 설정 화면의 편집 행과 달리 **저장을 눌러야 반영**한다 —
 * 닫기로 취소할 수 있어야 하기 때문이다.
 */
export function CategoryEditSheet({ category, onSubmit, onClose }: CategoryEditSheetProps) {
  const [name, setName] = useState(category.name);
  const [budget, setBudget] = useState<number | undefined>(category.budget);
  const [targetAmountPerUse, setTargetAmountPerUse] = useState<number | undefined>(
    category.targetAmountPerUse,
  );

  const { open, close, onExited } = useDeferredClose(onClose);
  const sheetMaxHeight = useSheetMaxHeight();
  const nameInputRef = useRef<HTMLInputElement>(null);
  useAutoFocus(nameInputRef);

  // 빈 칸(undefined)과 0을 구분해야 하므로 검증은 순수 함수가 한다
  const patch = buildCategoryEditPatch({ name, budget, targetAmountPerUse });

  const save = () => {
    if (!patch) return;
    onSubmit(patch);
    close();
  };

  return (
    <BottomSheet
      open={open}
      hasTextField
      /* `maxHeight` prop은 마운트 시점 값으로 굳으므로 style로 덮어쓴다 */
      style={sheetMaxHeight != null ? { maxHeight: sheetMaxHeight } : undefined}
      onDimmerClick={close}
      onExited={onExited}
      header={<BottomSheet.Header>항목 수정</BottomSheet.Header>}
      cta={
        <BottomSheet.CTA disabled={patch === null} onClick={save}>
          저장
        </BottomSheet.CTA>
      }
    >
      <div className="sheet-body">
        <TextField
          ref={nameInputRef}
          variant="box"
          label="항목 이름"
          labelOption="sustain"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          paddingBottom={0}
        />
        <AmountField
          variant="box"
          label="월 예산"
          labelOption="sustain"
          suffix="원"
          value={budget}
          onChange={setBudget}
          paddingBottom={0}
        />
        <AmountField
          variant="box"
          label="1회 사용 목표 금액"
          labelOption="sustain"
          placeholder="없음"
          suffix="원"
          value={targetAmountPerUse}
          onChange={setTargetAmountPerUse}
          paddingBottom={0}
        />
      </div>
    </BottomSheet>
  );
}
