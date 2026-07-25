import { Badge, ListRow, Paragraph, ProgressBar } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import type { CategoryStats } from "../lib/calculations";
import { STATUS_LABEL } from "../lib/calculations";
import { formatCurrency, formatPercent } from "../lib/format";
import { STATUS_BADGE, STATUS_COLOR, toProgress } from "./statusTheme";

interface CategoryCardProps {
  stats: CategoryStats;
  onAddExpense: (categoryId: string) => void;
}

/** 예산 항목 한 행. 행 전체를 누르면 해당 항목으로 지출 추가 시트가 열린다. */
export function CategoryCard({ stats, onAddExpense }: CategoryCardProps) {
  const { category, budget, used, remaining, usageRate, status, remainingCount } = stats;
  const badge = STATUS_BADGE[status];
  const over = remaining < 0;

  return (
    <ListRow
      as="button"
      type="button"
      className="cat-row"
      border="none"
      verticalPadding="medium"
      withTouchEffect
      aria-label={`${category.name} 지출 추가`}
      onClick={() => onAddExpense(category.id)}
      contents={
        <div className="cat-body">
          <div className="cat-line">
            <Paragraph typography="t6" fontWeight="semibold" color={adaptive.grey900}>
              <Paragraph.Text>{category.name}</Paragraph.Text>
            </Paragraph>
            <Badge size="xsmall" variant={badge.variant} color={badge.color}>
              {STATUS_LABEL[status]}
            </Badge>
          </div>

          <div className="cat-line">
            <Paragraph
              typography="t5"
              fontWeight="bold"
              color={over ? adaptive.red500 : adaptive.grey900}
            >
              <Paragraph.Text>{formatCurrency(remaining)}</Paragraph.Text>
            </Paragraph>
            <Paragraph typography="t7" fontWeight="semibold" color={STATUS_COLOR[status]}>
              <Paragraph.Text>{formatPercent(usageRate)}</Paragraph.Text>
            </Paragraph>
          </div>

          <ProgressBar
            size="normal"
            progress={toProgress(usageRate)}
            color={STATUS_COLOR[status]}
          />

          <div className="cat-line">
            <Paragraph typography="st13" color={adaptive.grey500}>
              <Paragraph.Text>
                {formatCurrency(used)} / {formatCurrency(budget)}
              </Paragraph.Text>
            </Paragraph>
            {remainingCount !== undefined && (
              <Paragraph typography="st13" color={adaptive.grey500}>
                <Paragraph.Text>남은 {remainingCount}회</Paragraph.Text>
              </Paragraph>
            )}
          </div>
        </div>
      }
    />
  );
}
