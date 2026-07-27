import { ListRow, Paragraph, ProgressBar } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { CategoryStats } from "../lib/calculations";
import { formatCurrency, formatPercent, formatThousands } from "../lib/format";
import { StatusBadge } from "./StatusBadge";
import { STATUS_COLOR, toProgress } from "./statusTheme";

interface CategoryCardProps {
  stats: CategoryStats;
  onAddExpense: (categoryId: string) => void;
}

/** 예산 항목 한 행. 행 전체를 누르면 해당 항목으로 지출 추가 시트가 열린다. */
export function CategoryCard({ stats, onAddExpense }: CategoryCardProps) {
  const { category, budget, used, remaining, usageRate, status, remainingCount } = stats;
  const over = remaining < 0;

  return (
    <ListRow
      as="button"
      type="button"
      className="cat-row"
      border="none"
      verticalPadding="medium"
      horizontalPadding="small"
      withTouchEffect
      aria-label={`${category.name} 지출 추가`}
      onClick={() => onAddExpense(category.id)}
      contents={
        <div className="cat-body">
          <div className="cat-line">
            <div className="cat-name">
              <Paragraph typography="t5" fontWeight="bold" color={adaptive.grey900}>
                <Paragraph.Text>{category.name}</Paragraph.Text>
              </Paragraph>
              <StatusBadge status={status} size="xsmall" />
            </div>
            <Paragraph
              typography="t4"
              fontWeight="bold"
              color={over ? adaptive.red500 : adaptive.grey900}
            >
              <Paragraph.Text>{formatCurrency(remaining)}</Paragraph.Text>
            </Paragraph>
          </div>

          <div className="cat-line">
            {/* 쓴 금액만 진하게, 나머지(예산·남은 횟수)는 흐리게 */}
            <div className="cat-meta">
              <Paragraph typography="t7" fontWeight="semibold" color={adaptive.grey700}>
                <Paragraph.Text>{formatThousands(used)}</Paragraph.Text>
              </Paragraph>
              <Paragraph typography="t7" color={adaptive.grey500}>
                <Paragraph.Text>
                  / {formatCurrency(budget)}
                  {remainingCount !== undefined ? ` · 남은 ${remainingCount}회` : ""}
                </Paragraph.Text>
              </Paragraph>
            </div>
            <Paragraph typography="t7" fontWeight="semibold" color={STATUS_COLOR[status]}>
              <Paragraph.Text>{formatPercent(usageRate)}</Paragraph.Text>
            </Paragraph>
          </div>

          <ProgressBar
            className="cat-bar"
            size="normal"
            progress={toProgress(usageRate)}
            color={STATUS_COLOR[status]}
          />
        </div>
      }
    />
  );
}
