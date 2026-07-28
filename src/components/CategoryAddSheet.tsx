import { useRef, useState } from "react";
import { BottomSheet, TextField } from "@toss/tds-mobile";
import type { NewCategoryInput } from "../types";
import { buildNewCategoryInput } from "../lib/category";
import { useAutoFocus } from "../hooks/useAutoFocus";
import { useDeferredClose } from "../hooks/useDeferredClose";
import { useSheetMaxHeight } from "../hooks/useSheetMaxHeight";
import { AmountField } from "./AmountField";

interface CategoryAddSheetProps {
  onSubmit: (input: NewCategoryInput) => void;
  onClose: () => void;
}

/** 대시보드에서 항목을 추가하는 하단 시트. 설정 화면의 추가 폼과 달리 추가하면 바로 닫힌다. */
export function CategoryAddSheet({ onSubmit, onClose }: CategoryAddSheetProps) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState<number | undefined>(undefined);
  const [targetAmountPerUse, setTargetAmountPerUse] = useState<number | undefined>(undefined);

  const { open, close, onExited } = useDeferredClose(onClose);
  const sheetMaxHeight = useSheetMaxHeight();
  const nameInputRef = useRef<HTMLInputElement>(null);
  useAutoFocus(nameInputRef);

  // 빈 칸(undefined)과 0을 구분해야 하므로 검증은 순수 함수가 한다
  const input = buildNewCategoryInput({ name, budget, targetAmountPerUse });

  const submit = () => {
    if (!input) return;
    onSubmit(input);
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
      header={<BottomSheet.Header>항목 추가</BottomSheet.Header>}
      cta={
        <BottomSheet.CTA disabled={input === null} onClick={submit}>
          추가
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
