import { useBudget } from "../context/BudgetContext";
import { formatMonthLabel } from "../lib/date";

export function MonthSelector() {
  const { currentMonth, goToPreviousMonth, goToNextMonth } = useBudget();

  return (
    <div className="month-nav">
      <button type="button" className="month-arrow" aria-label="이전 달" onClick={goToPreviousMonth}>
        ‹
      </button>
      <span className="month-label" aria-live="polite">
        {formatMonthLabel(currentMonth)}
      </span>
      <button type="button" className="month-arrow" aria-label="다음 달" onClick={goToNextMonth}>
        ›
      </button>
    </div>
  );
}
