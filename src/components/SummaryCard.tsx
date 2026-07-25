import type { MonthlyBudgetData } from "../types";
import { STATUS_LABEL, monthlySummary, projection, statusFromUsageRate } from "../lib/calculations";
import { formatCurrency, formatPercent } from "../lib/format";

export function SummaryCard({ data }: { data: MonthlyBudgetData }) {
  const summary = monthlySummary(data);
  const proj = projection(data);
  const status = statusFromUsageRate(summary.totalRate);
  const over = summary.totalRemaining < 0;
  const barWidth = Math.min(100, Math.max(0, summary.totalRate));

  return (
    <section className="summary" aria-label="이번 달 전체 요약">
      <div className="summary-top">
        <span className="summary-kicker">이번 달 남은 금액</span>
        <span className={`badge s-${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      <div className={`summary-amount ${over ? "is-over" : ""}`}>
        {formatCurrency(summary.totalRemaining)}
      </div>

      <div
        className="track-lg"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(summary.totalRate)}
        aria-label="전체 사용률"
      >
        <div className={`bar s-${status}`} style={{ width: `${barWidth}%` }} />
      </div>

      <div className="summary-row">
        <span>예산 {formatCurrency(summary.totalBudget)}</span>
        <span>
          사용 {formatCurrency(summary.totalUsed)} · {formatPercent(summary.totalRate)}
        </span>
      </div>

      <div className="summary-foot">
        <span>
          신용 <strong>{formatCurrency(summary.usedByMethod.credit)}</strong>
        </span>
        <span>
          체크 <strong>{formatCurrency(summary.usedByMethod.debit)}</strong>
        </span>
        {proj && (
          <span className="summary-proj">
            예상 잔액{" "}
            <strong className={proj.projectedRemaining < 0 ? "is-over" : ""}>
              {formatCurrency(proj.projectedRemaining)}
            </strong>
          </span>
        )}
      </div>
    </section>
  );
}
