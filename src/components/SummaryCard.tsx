import { Badge, Paragraph, ProgressBar } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { MonthlyBudgetData } from "../types";
import { STATUS_LABEL, monthlySummary, projection, statusFromUsageRate } from "../lib/calculations";
import { formatCurrency, formatPercent } from "../lib/format";
import { STATUS_BADGE, STATUS_COLOR, toProgress } from "./statusTheme";

export function SummaryCard({ data }: { data: MonthlyBudgetData }) {
  const summary = monthlySummary(data);
  const proj = projection(data);
  const status = statusFromUsageRate(summary.totalRate);
  const badge = STATUS_BADGE[status];
  const over = summary.totalRemaining < 0;

  return (
    <section className="summary" aria-label="이번 달 전체 요약">
      <div className="summary-top">
        <Paragraph typography="t7" color={adaptive.grey600} fontWeight="medium">
          <Paragraph.Text>이번 달 남은 금액</Paragraph.Text>
        </Paragraph>
        <Badge size="small" variant={badge.variant} color={badge.color}>
          {STATUS_LABEL[status]}
        </Badge>
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
      >
        <ProgressBar
          size="bold"
          progress={toProgress(summary.totalRate)}
          color={STATUS_COLOR[status]}
        />
      </div>

      <div className="summary-row">
        <Paragraph typography="t7" color={adaptive.grey600}>
          <Paragraph.Text>예산 {formatCurrency(summary.totalBudget)}</Paragraph.Text>
        </Paragraph>
        <Paragraph typography="t7" color={adaptive.grey600}>
          <Paragraph.Text>
            사용 {formatCurrency(summary.totalUsed)} · {formatPercent(summary.totalRate)}
          </Paragraph.Text>
        </Paragraph>
      </div>

      <div className="summary-foot">
        <SummaryStat label="신용" value={formatCurrency(summary.usedByMethod.credit)} />
        <SummaryStat label="체크" value={formatCurrency(summary.usedByMethod.debit)} />
        {proj && (
          <SummaryStat
            label="예상 잔액"
            value={formatCurrency(proj.projectedRemaining)}
            color={proj.projectedRemaining < 0 ? adaptive.red500 : undefined}
          />
        )}
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <span className="summary-stat">
      <Paragraph typography="st13" color={adaptive.grey500}>
        <Paragraph.Text>{label}</Paragraph.Text>
      </Paragraph>
      <Paragraph typography="t7" fontWeight="semibold" color={color ?? adaptive.grey800}>
        <Paragraph.Text>{value}</Paragraph.Text>
      </Paragraph>
    </span>
  );
}
