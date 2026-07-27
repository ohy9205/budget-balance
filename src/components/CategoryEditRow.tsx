import { Border, IconButton, TextField } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { BudgetCategory } from "../types";
import { AmountField } from "./AmountField";

interface CategoryEditRowProps {
  category: BudgetCategory;
  isFirst: boolean;
  isLast: boolean;
  /** 기본값과 달라진 설정 목록. 비어 있으면 되돌릴 것이 없다. */
  changes: string[];
  onUpdate: (patch: Partial<Omit<BudgetCategory, "id" | "seedKey">>) => void;
  onMove: (direction: "up" | "down") => void;
  onReset: () => void;
  onDelete: () => void;
}

/**
 * 설정 화면의 항목 편집 한 줄 — 왼쪽 폼 / 오른쪽 조작 버튼 2단.
 * 입력은 로컬 state 없이 `onUpdate`로 바로 올린다(=키 입력마다 저장·재계산).
 */
export function CategoryEditRow({
  category,
  isFirst,
  isLast,
  changes,
  onUpdate,
  onMove,
  onReset,
  onDelete,
}: CategoryEditRowProps) {
  return (
    <div>
      <div className="cat-edit-row">
        <div className="cat-edit-fields">
          <TextField
            variant="box"
            label="항목 이름"
            labelOption="sustain"
            value={category.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            paddingBottom={0}
          />
          <AmountField
            variant="box"
            label="월 예산"
            labelOption="sustain"
            suffix="원"
            value={category.monthlyBudget}
            onChange={(v) => onUpdate({ monthlyBudget: v ?? 0 })}
            paddingBottom={0}
          />
          <AmountField
            variant="box"
            label="목표 1회 지출액"
            labelOption="sustain"
            placeholder="없음"
            suffix="원"
            value={category.targetExpenseAmount}
            onChange={(v) => onUpdate({ targetExpenseAmount: v && v > 0 ? v : undefined })}
          />
        </div>

        <div className="cat-edit-actions">
          <div className="cat-edit-actions-group">
            <IconButton
              name="icon-arrow-up-mono"
              aria-label={`${category.name} 위로`}
              color={adaptive.grey600}
              disabled={isFirst}
              onClick={() => onMove("up")}
            />
            <IconButton
              name="icon-arrow-down-mono"
              aria-label={`${category.name} 아래로`}
              color={adaptive.grey600}
              disabled={isLast}
              onClick={() => onMove("down")}
            />
          </div>
          <div className="cat-edit-actions-group">
            <IconButton
              name="icon-refresh-mono"
              aria-label={`${category.name} 설정을 기본값으로 되돌리기`}
              color={adaptive.grey600}
              title={
                category.seedKey
                  ? "이름·월 예산·목표 1회 지출액을 기본 예산값으로 되돌립니다"
                  : "직접 추가한 항목이라 되돌릴 기본값이 없습니다"
              }
              disabled={changes.length === 0}
              onClick={onReset}
            />
            <IconButton
              name="icon-x-circle-mono"
              aria-label={`${category.name} 삭제`}
              color={adaptive.red500}
              title={`'${category.name}' 항목과 이 달의 해당 지출 내역을 삭제합니다`}
              onClick={onDelete}
            />
          </div>
        </div>
      </div>

      <Border variant="full" />
    </div>
  );
}
