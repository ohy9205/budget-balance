import { Badge, Paragraph, TopNavigationIconButton } from "@toss/tds-mobile";
import { adaptive } from "@toss/tds-colors";
import { useBudget } from "../../context/BudgetContext";
import { formatMonthLabel, isPastMonth } from "../../lib/date";

/** 상단 내비게이션 가운데의 월 이동 컨트롤 */
export function MonthSelector() {
  const { currentMonth, goToPreviousMonth, goToNextMonth } = useBudget();

  return (
    <div className="month-nav">
      <TopNavigationIconButton
        name="icon-arrow-left-small-mono"
        aria-label="이전 달"
        onClick={goToPreviousMonth}
      />
      <Paragraph typography="t5" fontWeight="bold" color={adaptive.grey900}>
        <Paragraph.Text aria-live="polite">{formatMonthLabel(currentMonth)}</Paragraph.Text>
      </Paragraph>
      {isPastMonth(currentMonth) && (
        <Badge size="xsmall" variant="weak" color="elephant">
          지난달
        </Badge>
      )}
      <TopNavigationIconButton
        name="icon-arrow-right-small-mono"
        aria-label="다음 달"
        onClick={goToNextMonth}
      />
    </div>
  );
}
