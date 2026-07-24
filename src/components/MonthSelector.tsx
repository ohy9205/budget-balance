import { useBudget } from "../context/BudgetContext";
import { formatMonthLabel } from "../lib/date";

export function MonthSelector() {
  const { currentMonth, goToPreviousMonth, goToNextMonth } = useBudget();

  return (
    <div className="month-selector">
      <button
        type="button"
        className="icon-btn"
        aria-label="이전 달"
        onClick={goToPreviousMonth}
      >
        ‹
      </button>
      <h1 className="month-label" aria-live="polite">
        {formatMonthLabel(currentMonth)}
      </h1>
      <button type="button" className="icon-btn" aria-label="다음 달" onClick={goToNextMonth}>
        ›
      </button>
    </div>
  );
}
