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
import { formatThousands, toAmountDigits } from "../lib/format";

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

/** 딤 영역을 눌러 닫을 수 있도록 시트 위쪽에 남겨 둘 여백 */
const SHEET_TOP_GAP = 24;

/**
 * 키보드 위로 실제 보이는 영역에 맞춰 시트 높이를 자른다.
 * TDS 기본 높이는 키보드가 떠도 줄지 않아 금액 입력이 화면 밖으로 밀린다.
 */
function useSheetMaxHeight() {
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  // 비율 상한은 항상 "키보드가 없을 때"의 높이를 기준으로 잡는다.
  const fullHeightRef = useRef(0);

  useEffect(() => {
    const update = () => {
      const visible = window.visualViewport?.height ?? window.innerHeight;
      fullHeightRef.current = Math.max(fullHeightRef.current, window.innerHeight);
      setMaxHeight(Math.min(visible - SHEET_TOP_GAP, fullHeightRef.current * 0.7));
    };

    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return maxHeight;
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

  // 닫힘 애니메이션을 재생한 뒤 호출부에 알리고, 후처리(삭제 요청 등)를 이어서 실행한다.
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);
  const afterExitRef = useRef<(() => void) | null>(null);

  const activeCatName = sortedCategories.find((c) => c.id === categoryId)?.name ?? "";
  const amountValue = parseInt(amount || "0", 10);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const sheetMaxHeight = useSheetMaxHeight();

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

  return (
    <BottomSheet
      open={open}
      hasTextField
      /* `maxHeight` prop은 마운트 시점 값으로 굳으므로 style로 덮어쓴다 */
      style={sheetMaxHeight != null ? { maxHeight: sheetMaxHeight } : undefined}
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
          value={formatThousands(amount)}
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
