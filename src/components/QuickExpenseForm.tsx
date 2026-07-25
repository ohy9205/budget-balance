import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BottomSheet,
  Button,
  Chip,
  ChipItem,
  SegmentedControl,
  TextField,
} from "@toss/tds-mobile";
import type { BudgetCategory, Expense, PaymentMethod } from "../types";
import type { NewExpenseInput } from "../context/BudgetContext";

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

const MAX_AMOUNT_DIGITS = 9;

/** 입력 문자열에서 숫자만 남기고 앞자리 0과 자릿수 초과분을 정리한다. */
function toAmountDigits(raw: string) {
  return raw
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, MAX_AMOUNT_DIGITS);
}

/** 지출 입력 하단 시트(추가·수정 공용). 금액은 디바이스 숫자 키보드로 입력한다. */
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
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const firstCategoryId = sortedCategories[0]?.id ?? "";
  const preferredCategoryId = editing?.categoryId ?? defaultCategoryId;
  const initialCategoryId =
    preferredCategoryId && sortedCategories.some((c) => c.id === preferredCategoryId)
      ? preferredCategoryId
      : firstCategoryId;

  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editing?.paymentMethod ?? defaultPaymentMethod ?? "credit",
  );

  // 시트를 닫을 때는 먼저 닫힘 애니메이션을 재생하고, 끝난 뒤 호출부에 알린다.
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);

  // 닫힘 애니메이션이 끝난 뒤 실행할 후처리(삭제 요청 등)
  const afterExitRef = useRef<(() => void) | null>(null);

  const activeCatName = sortedCategories.find((c) => c.id === categoryId)?.name ?? "";
  const amountValue = parseInt(amount || "0", 10);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // 시트가 열리며 포커스를 옮기므로, 그 뒤에 금액 입력으로 되돌린다.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const input = amountInputRef.current;
      if (!input) return;
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const save = () => {
    if (!amountValue || amountValue <= 0) return;
    if (!categoryId) return;
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
    afterExitRef.current = () => onRequestDelete(editing);
    close();
  };

  const saveButton = (
    <Button
      color="primary"
      display="block"
      size="xlarge"
      disabled={amountValue <= 0}
      onClick={save}
    >
      {editing ? "저장" : "추가"}
    </Button>
  );

  return (
    <BottomSheet
      open={open}
      hasTextField
      onDimmerClick={close}
      onExited={() => {
        const after = afterExitRef.current;
        afterExitRef.current = null;
        onClose();
        after?.();
      }}
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
              <Button color="light" display="block" size="xlarge" onClick={requestDelete}>
                삭제
              </Button>
            }
            rightButton={saveButton}
          />
        ) : (
          <BottomSheet.CTA disabled={amountValue <= 0} onClick={save}>
            {editing ? "저장" : "추가"}
          </BottomSheet.CTA>
        )
      }
    >
      <div className="sheet-body">
        <TextField
          ref={amountInputRef}
          variant="hero"
          type="text"
          inputMode="numeric"
          enterKeyHint="done"
          autoComplete="off"
          aria-label="금액"
          placeholder="0"
          suffix="원"
          value={amount === "" ? "" : Number(amount).toLocaleString("ko-KR")}
          onChange={(e) => setAmount(toAmountDigits(e.target.value))}
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
          <SegmentedControl.Item value="credit">신용카드</SegmentedControl.Item>
          <SegmentedControl.Item value="debit">체크카드</SegmentedControl.Item>
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
