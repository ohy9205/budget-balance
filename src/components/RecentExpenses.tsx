import { useMemo, useState } from "react";
import type { BudgetCategory, Expense } from "../types";
import { paymentMethodLabel } from "../constants";
import { formatCurrency, formatDateLabel } from "../lib/format";

interface RecentExpensesProps {
  expenses: Expense[];
  categories: BudgetCategory[];
  onEdit: (expense: Expense) => void;
}

const RECENT_LIMIT = 6;

/** 최근 지출 — 접기/펼치기 가능한 목록(최신 6건). 행 클릭 = 수정 시트. */
export function RecentExpenses({ expenses, categories, onEdit }: RecentExpensesProps) {
  const [open, setOpen] = useState(true);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "(삭제된 항목)";
  }, [categories]);

  // 최신순: createdAt 내림차순 (동률이면 date 내림차순)
  const recent = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => {
          if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
          return a.date < b.date ? 1 : -1;
        })
        .slice(0, RECENT_LIMIT),
    [expenses],
  );

  return (
    <>
      <button
        type="button"
        className="section-head recent"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="section-title">
          최근 지출 <span className="section-note inline">· {expenses.length}건</span>
        </span>
        <span className="toggle-label">
          {open ? "접기" : "펼치기"}
          <span className={`chev ${open ? "" : "closed"}`}>▾</span>
        </span>
      </button>

      {open && (
        <div className="list-block exps">
          {recent.length === 0 ? (
            <p className="list-empty">아직 등록된 지출이 없습니다.</p>
          ) : (
            recent.map((e) => (
              <button
                key={e.id}
                type="button"
                className="exp-row"
                aria-label={`${categoryName(e.categoryId)} ${formatCurrency(e.amount)} 지출 수정`}
                onClick={() => onEdit(e)}
              >
                <span className="exp-main">
                  <span className="exp-cat">{categoryName(e.categoryId)}</span>
                  <span className="exp-sub">
                    {formatDateLabel(e.date)} · {paymentMethodLabel(e.paymentMethod)}
                    {e.memo ? ` · ${e.memo}` : ""}
                  </span>
                </span>
                <span className="exp-right">
                  <span className="exp-amt">{formatCurrency(e.amount)}</span>
                  <span className="exp-chev" aria-hidden="true">
                    ›
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </>
  );
}
