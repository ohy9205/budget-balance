import type { CategoryStats } from "../lib/calculations";
import { STATUS_LABEL } from "../lib/calculations";
import { formatCurrency, formatPercent } from "../lib/format";

interface CategoryCardProps {
  stats: CategoryStats;
  onAddExpense: (categoryId: string) => void;
}

/** 예산 항목 한 행. 행 전체를 누르면 해당 항목으로 지출 추가 시트가 열린다. */
export function CategoryCard({ stats, onAddExpense }: CategoryCardProps) {
  const { category, budget, used, remaining, usageRate, status, remainingCount } = stats;
  const over = remaining < 0;
  const barWidth = Math.min(100, Math.max(0, usageRate));

  return (
    <button
      type="button"
      className="cat-row"
      onClick={() => onAddExpense(category.id)}
      aria-label={`${category.name} 지출 추가`}
    >
      <div className="cat-row-top">
        <span className={`cat-dot s-${status}`} aria-hidden="true" />
        <span className="cat-name">{category.name}</span>
        <span className={`badge sm s-${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      <div className="cat-row-mid">
        <span className="cat-remaining">
          <span className="cat-remaining-lbl">남은</span>
          <span className={`cat-remaining-val ${over ? "is-over" : ""}`}>
            {formatCurrency(remaining)}
          </span>
        </span>
        <span className={`rate s-${status}`}>{formatPercent(usageRate)}</span>
      </div>

      <div className="track">
        <div className={`bar s-${status}`} style={{ width: `${barWidth}%` }} />
      </div>

      <div className="cat-row-foot">
        <span>
          {formatCurrency(used)} / {formatCurrency(budget)}
        </span>
        {remainingCount !== undefined && <span>남은 {remainingCount}회</span>}
      </div>
    </button>
  );
}
