import { useMemo } from "react";
import type { BudgetCategory, Expense } from "../types";
import { paymentMethodLabel } from "../constants";
import { formatCurrency, formatDateLabel } from "../lib/format";

interface RecentExpensesProps {
  expenses: Expense[];
  categories: BudgetCategory[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function RecentExpenses({ expenses, categories, onEdit, onDelete }: RecentExpensesProps) {
  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "(삭제된 항목)";
  }, [categories]);

  // 최신순: createdAt 내림차순 (동률이면 date 내림차순)
  const sorted = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
        return a.date < b.date ? 1 : -1;
      }),
    [expenses],
  );

  return (
    <section className="recent" aria-label="최근 지출 내역">
      <h2 className="section-title">최근 지출 내역</h2>
      {sorted.length === 0 ? (
        <p className="muted empty">아직 등록된 지출이 없습니다.</p>
      ) : (
        <ul className="expense-list">
          {sorted.map((e) => (
            <li key={e.id} className="expense-item">
              <div className="expense-main">
                <div className="expense-top">
                  <span className="expense-category">{categoryName(e.categoryId)}</span>
                  <span className="expense-amount">{formatCurrency(e.amount)}</span>
                </div>
                <div className="expense-sub muted">
                  <span>{formatDateLabel(e.date)}</span>
                  <span>· {paymentMethodLabel(e.paymentMethod)}</span>
                  {e.memo && <span>· {e.memo}</span>}
                </div>
              </div>
              <div className="expense-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`${categoryName(e.categoryId)} 지출 수정`}
                  onClick={() => onEdit(e)}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger-outline"
                  aria-label={`${categoryName(e.categoryId)} 지출 삭제`}
                  onClick={() => onDelete(e)}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
