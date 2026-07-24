import type { CategoryStats } from "../lib/calculations";
import { STATUS_LABEL } from "../lib/calculations";
import { formatCurrency, formatPercent } from "../lib/format";

interface CategoryCardProps {
  stats: CategoryStats;
  onAddExpense: (categoryId: string) => void;
}

export function CategoryCard({ stats, onAddExpense }: CategoryCardProps) {
  const { category, budget, used, remaining, usageRate, status, remainingCount } = stats;
  const over = status === "over";
  const barWidth = Math.min(100, Math.max(0, usageRate));

  return (
    <article className={`category-card status-${status}`}>
      <header className="category-header">
        <h3 className="category-name">{category.name}</h3>
        <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
      </header>

      <div className="category-remaining">
        <span className="muted">남은 금액</span>
        <strong className={over ? "is-over" : ""}>{formatCurrency(remaining)}</strong>
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(usageRate)}
        aria-label={`${category.name} 사용률`}
      >
        <div className={`progress-bar status-${status}`} style={{ width: `${barWidth}%` }} />
      </div>

      <dl className="category-meta">
        <div>
          <dt>예산</dt>
          <dd>{formatCurrency(budget)}</dd>
        </div>
        <div>
          <dt>사용</dt>
          <dd>{formatCurrency(used)}</dd>
        </div>
        <div>
          <dt>사용률</dt>
          <dd>{formatPercent(usageRate)}</dd>
        </div>
        {remainingCount !== undefined && (
          <div>
            <dt>남은 횟수</dt>
            <dd>{remainingCount}회</dd>
          </div>
        )}
      </dl>

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => onAddExpense(category.id)}
      >
        지출 추가
      </button>
    </article>
  );
}
