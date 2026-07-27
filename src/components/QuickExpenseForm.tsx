import { useRef, useState } from "react";
import { BottomSheet, Button, Chip, ChipItem, SegmentedControl } from "@toss/tds-mobile";
import type { BudgetCategory, Expense, NewExpenseInput, PaymentMethod } from "../types";
import { PAYMENT_METHODS } from "../constants";
import { resolveInitialCategoryId, sortByOrder } from "../lib/category";
import { useAutoFocus } from "../hooks/useAutoFocus";
import { useDeferredClose } from "../hooks/useDeferredClose";
import { useSheetMaxHeight } from "../hooks/useSheetMaxHeight";
import { AmountField } from "./AmountField";

interface QuickExpenseFormProps {
  categories: BudgetCategory[];
  defaultCategoryId?: string;
  defaultPaymentMethod?: PaymentMethod;
  defaultDate: string;
  /** 지정하면 수정 모드 — 값이 채워진 채로 열리고 날짜·메모는 원본을 유지한다. */
  editing?: Expense;
  onSubmit: (input: NewExpenseInput) => void;
  /** 수정 모드의 삭제 버튼. 호출부가 확인 다이얼로그를 띄운다. */
  onRequestDelete?: (expense: Expense) => void;
  onClose: () => void;
}

/**
 * 지출 입력 하단 시트(추가·수정 공용). 금액은 디바이스 숫자 키보드로 받는다 —
 * TDS `NumberKeypad`는 레이아웃 안에서 자리를 고정으로 차지해 본문이 눌린다.
 */
export function QuickExpenseForm({
  categories,
  defaultCategoryId,
  defaultPaymentMethod,
  defaultDate,
  editing,
  onSubmit,
  onRequestDelete,
  onClose,
}: QuickExpenseFormProps) {
  const sortedCategories = sortByOrder(categories);

  const [amount, setAmount] = useState<number | undefined>(editing?.amount);
  const [categoryId, setCategoryId] = useState(() =>
    resolveInitialCategoryId(sortedCategories, editing?.categoryId ?? defaultCategoryId),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editing?.paymentMethod ?? defaultPaymentMethod ?? "credit",
  );

  const { open, close, runAfterClose, onExited } = useDeferredClose(onClose);
  const sheetMaxHeight = useSheetMaxHeight();
  const amountInputRef = useRef<HTMLInputElement>(null);
  useAutoFocus(amountInputRef);

  const amountValue = amount ?? 0;
  const activeCatName = sortedCategories.find((c) => c.id === categoryId)?.name ?? "";

  const save = () => {
    if (amountValue <= 0 || !categoryId) return;
    onSubmit({
      categoryId,
      amount: amountValue,
      paymentMethod,
      date: editing?.date ?? defaultDate,
      memo: editing?.memo,
    });
    close();
  };

  const requestDelete = () => {
    if (!editing || !onRequestDelete) return;
    // 시트가 닫힌 뒤에 확인 다이얼로그를 띄운다 (두 오버레이가 겹치지 않게)
    runAfterClose(() => onRequestDelete(editing));
  };

  return (
    <BottomSheet
      open={open}
      hasTextField
      /* `maxHeight` prop은 마운트 시점 값으로 굳으므로 style로 덮어쓴다 */
      style={sheetMaxHeight != null ? { maxHeight: sheetMaxHeight } : undefined}
      onDimmerClick={close}
      onExited={onExited}
      header={
        <BottomSheet.Header>
          {editing ? "지출 수정" : "지출 추가"}
          {activeCatName ? ` · ${activeCatName}` : ""}
        </BottomSheet.Header>
      }
      cta={
        editing && onRequestDelete ? (
          <BottomSheet.DoubleCTA
            leftButton={
              <Button
                color="danger"
                variant="weak"
                display="block"
                size="xlarge"
                onClick={requestDelete}
              >
                삭제
              </Button>
            }
            rightButton={
              <Button
                color="primary"
                display="block"
                size="xlarge"
                disabled={amountValue <= 0}
                onClick={save}
              >
                저장
              </Button>
            }
          />
        ) : (
          <BottomSheet.CTA disabled={amountValue <= 0} onClick={save}>
            추가
          </BottomSheet.CTA>
        )
      }
    >
      <div className="sheet-body">
        <AmountField
          ref={amountInputRef}
          variant="hero"
          enterKeyHint="done"
          autoComplete="off"
          aria-label="금액"
          placeholder="0"
          suffix="원"
          value={amount}
          onChange={setAmount}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
        />

        <SegmentedControl
          size="large"
          alignment="fixed"
          aria-label="결제수단"
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((m) => (
            <SegmentedControl.Item key={m.value} value={m.value}>
              {m.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl>

        <Chip wrap kind="select" margin="small" aria-label="예산 항목">
          {sortedCategories.map((c) => (
            <ChipItem
              key={c.id}
              as="button"
              type="button"
              selected={c.id === categoryId}
              aria-pressed={c.id === categoryId}
              onClick={() => setCategoryId(c.id)}
            >
              {c.name}
            </ChipItem>
          ))}
        </Chip>
      </div>
    </BottomSheet>
  );
}
