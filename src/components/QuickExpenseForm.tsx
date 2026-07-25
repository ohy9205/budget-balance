import { useId, useMemo, useState } from "react";
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

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "⌫"] as const;

/** 숫자 키패드 기반 지출 입력 하단 시트(추가·수정 공용). */
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

  const press = (key: string) => {
    if (key === "⌫") {
      setAmount((a) => a.slice(0, -1));
      return;
    }
    setAmount((a) => {
      if (a.replace(/^0+/, "").length >= 9) return a; // 9자리 초과 방지
      if (a === "" && key === "00") return a;
      return a + key;
    });
  };

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

        <div className="amount-display" aria-live="polite">
          <span className="amount-num">{amountValue.toLocaleString("ko-KR")}</span>
          <span className="amount-won"> 원</span>
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

        <div className="keypad">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="key"
              aria-label={key === "⌫" ? "지우기" : key}
              onClick={() => press(key)}
            >
              {key}
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
