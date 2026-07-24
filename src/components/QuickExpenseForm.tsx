import { useMemo, useState, type FormEvent } from "react";
import type { BudgetCategory, Expense, PaymentMethod } from "../types";
import type { NewExpenseInput } from "../context/BudgetContext";
import { PAYMENT_METHODS } from "../constants";
import { Modal } from "./Modal";

interface QuickExpenseFormProps {
  categories: BudgetCategory[];
  defaultCategoryId?: string;
  defaultPaymentMethod?: PaymentMethod;
  defaultDate: string;
  /** 수정 모드일 때 기존 지출 */
  editing?: Expense;
  onSubmit: (input: NewExpenseInput) => void;
  onClose: () => void;
}

export function QuickExpenseForm({
  categories,
  defaultCategoryId,
  defaultPaymentMethod,
  defaultDate,
  editing,
  onSubmit,
  onClose,
}: QuickExpenseFormProps) {
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const firstCategoryId = sortedCategories[0]?.id ?? "";
  const initialCategoryId =
    editing?.categoryId ??
    (defaultCategoryId && sortedCategories.some((c) => c.id === defaultCategoryId)
      ? defaultCategoryId
      : firstCategoryId);

  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : "");
  const [categoryId, setCategoryId] = useState<string>(initialCategoryId);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editing?.paymentMethod ?? defaultPaymentMethod ?? "credit",
  );
  const [date, setDate] = useState<string>(editing?.date ?? defaultDate);
  const [memo, setMemo] = useState<string>(editing?.memo ?? "");
  const [error, setError] = useState<string>("");

  const isEditing = Boolean(editing);

  const validateAmount = (): number | null => {
    const trimmed = amount.trim();
    if (trimmed === "") return null;
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return null;
    if (!Number.isInteger(num)) return null;
    if (num <= 0) return null;
    return num;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const validAmount = validateAmount();
    if (validAmount === null) {
      setError("금액은 0보다 큰 정수(원)로 입력해 주세요.");
      return;
    }
    if (!categoryId) {
      setError("예산 항목을 선택해 주세요.");
      return;
    }

    onSubmit({
      categoryId,
      amount: validAmount,
      paymentMethod,
      date,
      memo: memo.trim() || undefined,
    });

    if (isEditing) {
      onClose();
      return;
    }

    // 추가 모드: 폼 초기화하되 최근 항목/결제수단은 유지
    setAmount("");
    setMemo("");
    setError("");
  };

  return (
    <Modal title={isEditing ? "지출 수정" : "빠른 지출 입력"} onClose={onClose}>
      <form className="expense-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="expense-amount">금액 (원)</label>
          <input
            id="expense-amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="예: 25000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="expense-category">예산 항목</label>
          <select
            id="expense-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {sortedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <span className="field-label">결제수단</span>
          <div className="radio-row" role="radiogroup" aria-label="결제수단">
            {PAYMENT_METHODS.map((m) => (
              <label key={m.value} className={`radio-chip ${paymentMethod === m.value ? "is-active" : ""}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m.value}
                  checked={paymentMethod === m.value}
                  onChange={() => setPaymentMethod(m.value)}
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="expense-date">날짜</label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="expense-memo">메모 (선택)</label>
          <input
            id="expense-memo"
            type="text"
            placeholder="간단한 메모"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            닫기
          </button>
          <button type="submit" className="btn btn-primary">
            {isEditing ? "수정 저장" : "저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
