import type { MonthlyBudgetData } from "../types";
import { monthlySummary, paceWarning, projection } from "../lib/calculations";
import { formatCurrency, formatPercent } from "../lib/format";

export function SummaryCard({ data }: { data: MonthlyBudgetData }) {
  const summary = monthlySummary(data);
  const proj = projection(data);
  const pace = paceWarning(data);
  const over = summary.totalRemaining < 0;

  return (
    <section className="summary-card" aria-label="이번 달 전체 요약">
      <div className="summary-remaining">
        <span className="summary-remaining-label">남은 금액</span>
        <strong className={`summary-remaining-value ${over ? "is-over" : ""}`}>
          {formatCurrency(summary.totalRemaining)}
        </strong>
        {over && <span className="badge badge-over">예산 초과</span>}
      </div>

      <dl className="summary-grid">
        <div>
          <dt>전체 예산</dt>
          <dd>{formatCurrency(summary.totalBudget)}</dd>
        </div>
        <div>
          <dt>전체 사용액</dt>
          <dd>{formatCurrency(summary.totalUsed)}</dd>
        </div>
        <div>
          <dt>전체 사용률</dt>
          <dd>{formatPercent(summary.totalRate)}</dd>
        </div>
        <div>
          <dt>신용카드</dt>
          <dd>{formatCurrency(summary.usedByMethod.credit)}</dd>
        </div>
        <div>
          <dt>체크카드</dt>
          <dd>{formatCurrency(summary.usedByMethod.debit)}</dd>
        </div>
      </dl>

      {pace?.isFast && (
        <p className="warning-banner" role="status">
          ⚠️ 현재 지출 속도가 빠릅니다 (월 진행률 {formatPercent(pace.monthProgressPct)} · 사용률{" "}
          {formatPercent(pace.usageRatePct)})
        </p>
      )}

      {proj && (
        <div className="projection">
          <div className="projection-row">
            <span>하루 평균 지출</span>
            <span>{formatCurrency(proj.dailyAverage)}</span>
          </div>
          <div className="projection-row">
            <span>예상 월말 사용액</span>
            <span>{formatCurrency(proj.projectedUsed)}</span>
          </div>
          <div className="projection-row projection-highlight">
            <span>예상 월말 잔액</span>
            <span className={proj.projectedRemaining < 0 ? "is-over" : ""}>
              {formatCurrency(proj.projectedRemaining)}
            </span>
          </div>
          <p className="projection-note">
            월초에는 값이 크게 흔들릴 수 있어요. 현재 속도 기준 참고용입니다.
          </p>
        </div>
      )}
    </section>
  );
}
