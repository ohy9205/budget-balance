import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BudgetCategory, Expense, PaymentMethod } from "../types";
import type { NewExpenseInput } from "../context/BudgetContext";
import { Modal } from "./Modal";

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
  const titleId = useId();

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

  const activeCatName =
    sortedCategories.find((c) => c.id === categoryId)?.name ?? "";
  const amountValue = parseInt(amount || "0", 10);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Modal이 마운트 직후 패널로 포커스를 옮기므로, 그 뒤에 금액 입력으로 되돌린다.
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
    onClose();
  };

  return (
    <Modal variant="sheet" labelledBy={titleId} onClose={onClose}>
      <div className="sheet-panel">
        <div className="sheet-head">
          <span className="sheet-title" id={titleId}>
            {editing ? "지출 수정" : "지출 추가"} · {activeCatName}
          </span>
          <button type="button" className="sheet-close" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="amount-display">
          <input
            ref={amountInputRef}
            className="amount-input"
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            autoComplete="off"
            aria-label="금액"
            placeholder="0"
            value={amount === "" ? "" : Number(amount).toLocaleString("ko-KR")}
            onChange={(e) => setAmount(toAmountDigits(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
          />
          <span className="amount-won">원</span>
        </div>

        <div className="pay-row" role="radiogroup" aria-label="결제수단">
          <button
            type="button"
            className={`pay-btn ${paymentMethod === "credit" ? "active" : ""}`}
            aria-pressed={paymentMethod === "credit"}
            onClick={() => setPaymentMethod("credit")}
          >
            신용카드
          </button>
          <button
            type="button"
            className={`pay-btn ${paymentMethod === "debit" ? "active" : ""}`}
            aria-pressed={paymentMethod === "debit"}
            onClick={() => setPaymentMethod("debit")}
          >
            체크카드
          </button>
        </div>

        <div className="chip-row" role="radiogroup" aria-label="예산 항목">
          {sortedCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${c.id === categoryId ? "active" : ""}`}
              aria-pressed={c.id === categoryId}
              onClick={() => setCategoryId(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="sheet-actions">
          {editing && onRequestDelete && (
            <button
              type="button"
              className="del-btn"
              onClick={() => onRequestDelete(editing)}
            >
              삭제
            </button>
          )}
          <button type="button" className="save-btn" onClick={save} disabled={amountValue <= 0}>
            {editing ? "저장" : "추가"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
