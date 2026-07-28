import type { CSSProperties } from "react";
import { Paragraph, ProgressBar } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { MonthlyBudgetData } from "../../types";
import { monthlySummary, statusFromUsageRate } from "../../lib/calculations";
import { formatCurrency, formatPercent } from "../../lib/format";
import { StatusBadge } from "../common/StatusBadge";
import { STATUS_COLOR, toProgress } from "../common/statusTheme";

export function SummaryCard({ data }: { data: MonthlyBudgetData }) {
  const summary = monthlySummary(data);
  const status = statusFromUsageRate(summary.totalRate);
  const over = summary.totalRemaining < 0;

  return (
    <section className="summary" aria-label="이번 달 전체 요약">
      <div className="summary-top">
        <Paragraph typography="t7" color={adaptive.grey600} fontWeight="medium">
          <Paragraph.Text>이번 달 남은 금액</Paragraph.Text>
        </Paragraph>
        <StatusBadge status={status} />
      </div>

      <Paragraph
        typography="t1"
        fontWeight="bold"
        color={over ? adaptive.red500 : adaptive.grey900}
      >
        <Paragraph.Text>{formatCurrency(summary.totalRemaining)}</Paragraph.Text>
      </Paragraph>

      <div
        className="summary-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(summary.totalRate)}
        aria-label="전체 사용률"
        style={
          { "--bar-progress": `${toProgress(summary.totalRate) * 100}%` } as CSSProperties
        }
      >
        <div className="summary-bar-head">
          <Paragraph typography="t7" color={adaptive.grey600}>
            <Paragraph.Text>예산 {formatCurrency(summary.totalBudget)}</Paragraph.Text>
          </Paragraph>
        </div>
        <div className="summary-bar-track">
          <ProgressBar
            size="bold"
            progress={toProgress(summary.totalRate)}
            color={STATUS_COLOR[status]}
          />
          <span className="summary-bar-badge" style={{ background: STATUS_COLOR[status] }}>
            <Paragraph typography="st13" fontWeight="bold" color={adaptive.background}>
              <Paragraph.Text>{formatPercent(summary.totalRate)}</Paragraph.Text>
            </Paragraph>
          </span>
          {/* 쓴 금액만 진하게, 라벨은 흐리게 */}
          <span className="summary-bar-used">
            <Paragraph typography="t7" color={adaptive.grey600}>
              <Paragraph.Text>사용 </Paragraph.Text>
              <Paragraph.Text fontWeight="semibold" color={adaptive.grey800}>
                {formatCurrency(summary.totalUsed)}
              </Paragraph.Text>
            </Paragraph>
          </span>
        </div>
      </div>
    </section>
  );
}
